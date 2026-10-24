package talk.phreox.space.guild;

import talk.phreox.api.http.ApiException;
import talk.phreox.space.permission.Explanation;
import talk.phreox.space.permission.Permission;
import talk.phreox.space.permission.PermissionEngine;
import talk.phreox.space.permission.PowerCheck;
import talk.phreox.space.permission.PowerEngine;
import talk.phreox.space.permission.PowerType;

import java.util.ArrayList;

/** Looks up spaces and enforces membership, permissions and power for every service. */
public final class SpaceAccess {

    public record ChannelContext(Space space, Channel channel) {
    }

    private final SpaceStore spaces;

    public SpaceAccess(SpaceStore spaces) {
        this.spaces = spaces;
    }

    public SpaceStore spaces() {
        return spaces;
    }

    /** Resolves the space for a member; non-members get the same answer as for unknown spaces. */
    public Space memberSpace(String spaceId, String userId) {
        var space = spaces.find(spaceId).orElseThrow(() -> ApiException.notFound("Space not found"));

        if (space.member(userId).isEmpty()) {
            throw ApiException.notFound("Space not found");
        }

        return space;
    }

    public Member member(Space space, String userId) {
        return space.member(userId).orElseThrow(() -> ApiException.notFound("Space not found"));
    }

    /** Resolves a channel the user may see; hidden channels look like missing ones. */
    public ChannelContext channel(String channelId, String userId) {
        var space = spaces.findByChannel(channelId).orElseThrow(() -> ApiException.notFound("Channel not found"));
        var channel = space.channel(channelId).orElseThrow(() -> ApiException.notFound("Channel not found"));

        if (space.member(userId).isEmpty() || !canView(space, userId, channel)) {
            throw ApiException.notFound("Channel not found");
        }

        return new ChannelContext(space, channel);
    }

    public Channel channelOf(Space space, String channelId) {
        return space.channel(channelId).orElseThrow(() -> ApiException.notFound("Channel not found"));
    }

    public boolean canView(Space space, String userId, Channel channel) {
        return can(space, userId, Permission.VIEW_CHANNEL, channel)
                && effectivePower(space, userId, PowerType.JOIN) >= channel.requiredJoinPower();
    }

    public Explanation explain(Space space, String userId, Permission permission, Channel channel) {
        return PermissionEngine.evaluate(space.defaults(), space.scopes(channel), space.subject(userId), permission);
    }

    public boolean can(Space space, String userId, Permission permission, Channel channel) {
        return explain(space, userId, permission, channel).allowed();
    }

    public void require(Space space, String userId, Permission permission, Channel channel) {
        if (!can(space, userId, permission, channel)) {
            throw ApiException.forbidden("Missing permission: " + permission.label());
        }
    }

    public int effectivePower(Space space, String userId, PowerType type) {
        return powerCheck(space, userId, type, 0).effective();
    }

    public PowerCheck powerCheck(Space space, String userId, PowerType type, int required) {
        var contributions = new ArrayList<PowerCheck.Contribution>();
        var member = space.member(userId);

        if (member.isPresent()) {
            for (var role : space.roles()) {
                if (member.get().roleIds().contains(role.id())) {
                    contributions.add(new PowerCheck.Contribution(role.name() + " Role", role.power(type)));
                }
            }
        }

        return PowerEngine.check(type, space.owner(userId), contributions, required);
    }

    /** Power needed to act on the target: the highest requirement among their roles. The owner cannot be acted on. */
    public int requiredPowerOn(Space space, String targetId, PowerType type) {
        if (space.owner(targetId)) {
            throw ApiException.forbidden("The space owner cannot be targeted");
        }

        var required = 0;
        var member = space.member(targetId);

        if (member.isPresent()) {
            for (var role : space.roles()) {
                if (member.get().roleIds().contains(role.id())) {
                    required = Math.max(required, role.required(type));
                }
            }
        }

        return required;
    }

    public void requirePowerOn(Space space, String actorId, String targetId, PowerType type) {
        var required = requiredPowerOn(space, targetId, type);

        if (!powerCheck(space, actorId, type, required).allowed()) {
            throw ApiException.forbidden("Not enough " + type.name().toLowerCase() + " power");
        }
    }

    /** Roles may only be changed by someone ranked strictly above them, unless they own the space. */
    public void requireAbove(Space space, String actorId, Role role) {
        if (space.owner(actorId)) {
            return;
        }

        if (space.bestRank(actorId) >= space.rank(role)) {
            throw ApiException.forbidden("Role is not below your highest role");
        }

        if (!powerCheck(space, actorId, PowerType.MODIFY, role.required(PowerType.MODIFY)).allowed()) {
            throw ApiException.forbidden("Not enough modify power");
        }
    }
}
