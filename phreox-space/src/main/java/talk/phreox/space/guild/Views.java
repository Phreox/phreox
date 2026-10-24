package talk.phreox.space.guild;

import talk.phreox.api.SpaceApi;
import talk.phreox.space.permission.Permission;
import talk.phreox.space.permission.PowerSetting;
import talk.phreox.space.permission.PowerType;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

public final class Views {

    private Views() {
    }

    public static SpaceApi.SpaceView space(Space space) {
        return new SpaceApi.SpaceView(space.id(), space.name(), space.ownerId(), space.createdAt());
    }

    public static SpaceApi.CategoryView category(Space space, Category category) {
        return new SpaceApi.CategoryView(category.id(), space.id(), category.name());
    }

    public static SpaceApi.ChannelView channel(Space space, Channel channel) {
        return new SpaceApi.ChannelView(channel.id(), space.id(), channel.categoryId(), channel.name(), channel.mode(), channel.requiredJoinPower(), channel.createdAt());
    }

    public static SpaceApi.MemberView member(Space space, Member member) {
        return new SpaceApi.MemberView(member.userId(), space.id(), List.copyOf(member.roleIds()), member.joinedAt(), member.mutedUntil());
    }

    public static SpaceApi.RoleView role(Space space, Role role) {
        var permissions = new LinkedHashMap<String, String>();

        space.rolePermissions(role.id()).forEach((permission, state) -> permissions.put(permission.name(), state.name()));

        return new SpaceApi.RoleView(role.id(), space.id(), role.name(), space.rank(role), permissions,
                powers(role::powerSetting, role::power), powers(role::requiredSetting, role::required));
    }

    public static SpaceApi.InviteView invite(Space space, Invite invite) {
        return new SpaceApi.InviteView(invite.code(), space.id(), invite.maxUses(), invite.uses());
    }

    public static SpaceApi.AuditEntryView audit(AuditEntry entry) {
        return new SpaceApi.AuditEntryView(entry.id(), entry.action(), entry.actorId(), entry.targetId(), entry.detail(), entry.timestamp());
    }

    public static Permission permission(String name) {
        return Input.enumValue(Permission.class, name, "permission");
    }

    private static Map<String, SpaceApi.PowerView> powers(Function<PowerType, PowerSetting> setting, Function<PowerType, Short> value) {
        var powers = new LinkedHashMap<String, SpaceApi.PowerView>();

        for (var type : PowerType.values()) {
            powers.put(type.name(), new SpaceApi.PowerView(value.apply(type), setting.apply(type).mode().name()));
        }

        return powers;
    }
}
