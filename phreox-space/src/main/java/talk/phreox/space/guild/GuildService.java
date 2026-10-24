package talk.phreox.space.guild;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.api.pxp.ConversationMode;
import talk.phreox.space.event.SpaceEvents;
import talk.phreox.space.permission.Permission;
import talk.phreox.space.permission.PowerDistribution;
import talk.phreox.space.permission.PowerMode;
import talk.phreox.space.permission.PowerSetting;
import talk.phreox.space.permission.PowerType;
import talk.phreox.space.permission.ScopeType;
import talk.phreox.space.permission.Target;
import talk.phreox.space.permission.TargetType;
import talk.phreox.space.permission.TriState;

import java.security.SecureRandom;
import java.util.List;
import java.util.Set;

public final class GuildService {

    private static final String CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
    private static final int CODE_LENGTH = 8;
    private static final int MAX_INVITE_USES = 10_000;

    private static final Set<Permission> EVERYONE = Set.of(Permission.VIEW_CHANNEL, Permission.SEND_MESSAGES, Permission.ADD_REACTIONS,
            Permission.JOIN_VOICE, Permission.SPEAK, Permission.CREATE_INVITE);
    private static final Set<Permission> MODERATOR = Set.of(Permission.MANAGE_MESSAGES, Permission.KICK_MEMBERS, Permission.MUTE_MEMBERS,
            Permission.MOVE_MEMBERS, Permission.VIEW_AUDIT_LOG);

    private final SecureRandom random = new SecureRandom();
    private final SpaceAccess access;
    private final SpaceEvents events;

    public GuildService(SpaceAccess access, SpaceEvents events) {
        this.access = access;
        this.events = events;
    }

    public SpaceApi.SpaceView create(String userId, SpaceApi.CreateSpaceRequest request) {
        var space = new Space(Input.name(Input.body(request).name()), userId, System.currentTimeMillis());

        var owner = space.addRole("Owner", 0);
        var moderator = space.addRole("Moderator", 1);
        var member = space.addRole("Member", 2);

        for (var permission : Permission.values()) {
            space.override(ScopeType.SPACE, space.id(), new Target(TargetType.ROLE, owner.id()), permission, TriState.ALLOW);
        }

        for (var permission : MODERATOR) {
            space.override(ScopeType.SPACE, space.id(), new Target(TargetType.ROLE, moderator.id()), permission, TriState.ALLOW);
        }

        for (var permission : EVERYONE) {
            space.defaultState(permission, TriState.ALLOW);
        }

        space.memberRoleId(member.id());
        space.addMember(userId).roleIds().add(owner.id());

        var category = space.addCategory("Text");
        space.addChannel(category.id(), "general", ConversationMode.PUBLIC);
        space.audit("space.create", userId, space.id(), space.name());

        access.spaces().add(space);
        return Views.space(space);
    }

    public List<SpaceApi.SpaceView> list(String userId) {
        return access.spaces().all().stream().filter(space -> space.member(userId).isPresent()).map(Views::space).toList();
    }

    public SpaceApi.SpaceView get(String userId, String spaceId) {
        return Views.space(access.memberSpace(spaceId, userId));
    }

    public List<SpaceApi.MemberView> members(String userId, String spaceId) {
        var space = access.memberSpace(spaceId, userId);

        return space.members().stream().map(member -> Views.member(space, member)).toList();
    }

    // roles

    public List<SpaceApi.RoleView> roles(String userId, String spaceId) {
        var space = access.memberSpace(spaceId, userId);

        return space.roles().stream().map(role -> Views.role(space, role)).toList();
    }

    public SpaceApi.RoleView createRole(String userId, String spaceId, SpaceApi.CreateRoleRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_ROLES, null);

            var name = Input.name(Input.body(request).name());
            var index = request.position() == null ? space.roles().size() : request.position();

            requireInsertPosition(space, userId, index);

            var role = space.addRole(name, index);
            space.audit("role.create", userId, role.id(), name);

            return Views.role(space, role);
        }
    }

    public List<SpaceApi.RoleView> moveRole(String userId, String spaceId, String roleId, SpaceApi.MoveRoleRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_ROLES, null);

            var role = role(space, roleId);

            if (Input.body(request).position() == null) {
                throw ApiException.badRequest("Missing position");
            }

            if (space.rank(role) == 0) {
                throw ApiException.badRequest("The top role cannot be moved");
            }

            access.requireAbove(space, userId, role);
            requireInsertPosition(space, userId, request.position(), space.roles().size() - 1);

            space.moveRole(role, request.position());
            space.audit("role.move", userId, role.id(), String.valueOf(request.position()));

            return space.roles().stream().map(each -> Views.role(space, each)).toList();
        }
    }

    public void deleteRole(String userId, String spaceId, String roleId) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_ROLES, null);

            var role = role(space, roleId);

            if (space.rank(role) == 0 || role.id().equals(space.memberRoleId())) {
                throw ApiException.badRequest("This role cannot be deleted");
            }

            access.requireAbove(space, userId, role);

            space.removeRole(role);
            space.audit("role.delete", userId, role.id(), role.name());
        }
    }

    public SpaceApi.RoleView setPower(String userId, String spaceId, String roleId, SpaceApi.SetPowerRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_ROLES, null);

            var role = role(space, roleId);
            Input.body(request);

            var type = Input.enumValue(PowerType.class, request.type(), "type");
            var kind = Input.enumValue(PowerKind.class, request.kind(), "kind", PowerKind.POWER);
            var mode = Input.enumValue(PowerMode.class, request.mode(), "mode", PowerMode.MANUAL);
            var setting = mode == PowerMode.AUTO ? PowerSetting.auto() : PowerSetting.manual(request.value());

            access.requireAbove(space, userId, role);

            if (kind == PowerKind.POWER && mode == PowerMode.MANUAL && request.value() > access.effectivePower(space, userId, type)) {
                throw ApiException.forbidden("Cannot grant more power than you have");
            }

            if (kind == PowerKind.POWER) {
                role.power(type, setting);
            } else {
                role.required(type, setting);
            }

            space.audit("role.power", userId, role.id(), kind + " " + type + " " + mode + (mode == PowerMode.MANUAL ? " " + request.value() : ""));

            return Views.role(space, role);
        }
    }

    public SpaceApi.MemberView assignRole(String userId, String spaceId, String targetId, String roleId) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_ROLES, null);

            var role = role(space, roleId);
            var target = access.member(space, targetId);

            access.requireAbove(space, userId, role);
            target.roleIds().add(role.id());
            space.audit("member.role.add", userId, targetId, role.name());

            return Views.member(space, target);
        }
    }

    public SpaceApi.MemberView unassignRole(String userId, String spaceId, String targetId, String roleId) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_ROLES, null);

            var role = role(space, roleId);
            var target = access.member(space, targetId);

            if (role.id().equals(space.memberRoleId())) {
                throw ApiException.badRequest("The member role cannot be removed");
            }

            access.requireAbove(space, userId, role);
            target.roleIds().remove(role.id());
            space.audit("member.role.remove", userId, targetId, role.name());

            return Views.member(space, target);
        }
    }

    // categories and channels

    public List<SpaceApi.CategoryView> categories(String userId, String spaceId) {
        var space = access.memberSpace(spaceId, userId);

        return space.categories().stream().map(category -> Views.category(space, category)).toList();
    }

    public SpaceApi.CategoryView createCategory(String userId, String spaceId, SpaceApi.CreateCategoryRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_CHANNELS, null);

            var category = space.addCategory(Input.name(Input.body(request).name()));
            space.audit("category.create", userId, category.id(), category.name());

            return Views.category(space, category);
        }
    }

    public List<SpaceApi.ChannelView> channels(String userId, String spaceId) {
        var space = access.memberSpace(spaceId, userId);

        return space.channels().stream().filter(channel -> access.canView(space, userId, channel)).map(channel -> Views.channel(space, channel)).toList();
    }

    public SpaceApi.ChannelView createChannel(String userId, String spaceId, SpaceApi.CreateChannelRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_CHANNELS, null);

            var name = Input.name(Input.body(request).name());
            var mode = Input.enumValue(ConversationMode.class, request.mode(), "mode", ConversationMode.PUBLIC);

            if (request.categoryId() != null && space.category(request.categoryId()).isEmpty()) {
                throw ApiException.badRequest("Unknown category");
            }

            var channel = space.addChannel(request.categoryId(), name, mode);
            space.audit("channel.create", userId, channel.id(), name + " " + mode);

            return Views.channel(space, channel);
        }
    }

    public SpaceApi.ChannelView setRequiredJoinPower(String userId, String spaceId, String channelId, SpaceApi.SetValueRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MANAGE_CHANNELS, null);

            var channel = access.channelOf(space, channelId);
            var value = Input.body(request).value();

            if (value < 0 || value > PowerDistribution.MAX) {
                throw ApiException.badRequest("Power must be between 0 and " + PowerDistribution.MAX);
            }

            if (value > access.effectivePower(space, userId, PowerType.JOIN)) {
                throw ApiException.forbidden("Cannot require more join power than you have");
            }

            channel.requiredJoinPower((short) value);
            space.audit("channel.join-power", userId, channelId, String.valueOf(value));

            return Views.channel(space, channel);
        }
    }

    // invites and membership

    public SpaceApi.InviteView createInvite(String userId, String spaceId, SpaceApi.CreateInviteRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.CREATE_INVITE, null);

            var maxUses = request == null ? 0 : request.maxUses();

            if (maxUses < 0 || maxUses > MAX_INVITE_USES) {
                throw ApiException.badRequest("Invalid max uses");
            }

            var invite = space.addInvite(code(), maxUses);
            space.audit("invite.create", userId, invite.code(), String.valueOf(maxUses));

            return Views.invite(space, invite);
        }
    }

    public SpaceApi.MemberView join(String userId, String code) {
        var space = access.spaces().findByInvite(code).orElseThrow(() -> ApiException.notFound("Invite not found"));

        synchronized (space) {
            var existing = space.member(userId);

            if (existing.isPresent()) {
                return Views.member(space, existing.get());
            }

            var invite = space.invite(code).orElseThrow(() -> ApiException.notFound("Invite not found"));

            if (space.banned(userId)) {
                throw ApiException.forbidden("You are banned from this space");
            }

            if (invite.exhausted()) {
                throw ApiException.conflict("Invite has no uses left");
            }

            var member = space.addMember(userId);
            member.roleIds().add(space.memberRoleId());
            invite.use();

            space.audit("member.join", userId, userId, code);
            var view = Views.member(space, member);
            events.publish(space.id(), "member.join", null, view);

            return view;
        }
    }

    public void leave(String userId, String spaceId) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            if (space.owner(userId)) {
                throw ApiException.conflict("The owner cannot leave the space");
            }

            space.removeMember(userId);
            space.audit("member.leave", userId, userId, null);
            events.publish(space.id(), "member.leave", null, userId);
        }
    }

    private enum PowerKind {
        POWER,
        REQUIRED
    }

    private Role role(Space space, String roleId) {
        return space.role(roleId).orElseThrow(() -> ApiException.notFound("Role not found"));
    }

    private void requireInsertPosition(Space space, String userId, int index) {
        requireInsertPosition(space, userId, index, space.roles().size());
    }

    /** The top slot belongs to the owner role and nobody may place a role at or above their own rank. */
    private void requireInsertPosition(Space space, String userId, int index, int max) {
        if (index < 1 || index > max) {
            throw ApiException.badRequest("Position must be between 1 and " + max);
        }

        if (index <= space.bestRank(userId)) {
            throw ApiException.forbidden("Position is not below your highest role");
        }
    }

    private String code() {
        var code = new StringBuilder(CODE_LENGTH);

        for (var i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }

        return code.toString();
    }
}
