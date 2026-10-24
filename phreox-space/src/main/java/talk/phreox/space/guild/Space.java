package talk.phreox.space.guild;

import talk.phreox.api.pxp.ConversationMode;
import talk.phreox.space.permission.Permission;
import talk.phreox.space.permission.PermissionScope;
import talk.phreox.space.permission.PermissionSubject;
import talk.phreox.space.permission.PowerDistribution;
import talk.phreox.space.permission.ScopeType;
import talk.phreox.space.permission.Target;
import talk.phreox.space.permission.TargetType;
import talk.phreox.space.permission.TriState;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Authoritative state of one space. Accessors are synchronized on the instance,
 * services lock the same monitor around compound changes.
 */
public final class Space {

    private static final int MAX_AUDIT_ENTRIES = 1000;

    private final String id;
    private final String ownerId;
    private final long createdAt;
    private final List<Role> roles = new ArrayList<>();
    private final Map<String, Category> categories = new LinkedHashMap<>();
    private final Map<String, Channel> channels = new LinkedHashMap<>();
    private final Map<String, Member> members = new LinkedHashMap<>();
    private final Map<String, Invite> invites = new HashMap<>();
    private final Set<String> bans = new HashSet<>();
    private final Map<Permission, TriState> defaults = new EnumMap<>(Permission.class);
    private final Map<String, Map<Target, Map<Permission, TriState>>> overrides = new HashMap<>();
    private final List<AuditEntry> audit = new ArrayList<>();

    private String name;
    private String memberRoleId;
    private long auditSequence;

    public Space(String name, String ownerId, long createdAt) {
        this.id = UUID.randomUUID().toString();
        this.name = name;
        this.ownerId = ownerId;
        this.createdAt = createdAt;
    }

    public String id() {
        return id;
    }

    public synchronized String name() {
        return name;
    }

    public String ownerId() {
        return ownerId;
    }

    public long createdAt() {
        return createdAt;
    }

    public synchronized String memberRoleId() {
        return memberRoleId;
    }

    public synchronized void memberRoleId(String memberRoleId) {
        this.memberRoleId = memberRoleId;
    }

    public boolean owner(String userId) {
        return ownerId.equals(userId);
    }

    // roles

    public synchronized List<Role> roles() {
        return List.copyOf(roles);
    }

    public synchronized Optional<Role> role(String roleId) {
        return roles.stream().filter(role -> role.id().equals(roleId)).findFirst();
    }

    public synchronized int rank(Role role) {
        return roles.indexOf(role);
    }

    public synchronized Role addRole(String name, int index) {
        var role = new Role(UUID.randomUUID().toString(), name);

        roles.add(index, role);
        redistribute();

        return role;
    }

    public synchronized void moveRole(Role role, int index) {
        roles.remove(role);
        roles.add(index, role);
        redistribute();
    }

    public synchronized void removeRole(Role role) {
        roles.remove(role);
        redistribute();

        members.values().forEach(member -> member.roleIds().remove(role.id()));
        overrides.values().forEach(scope -> scope.remove(new Target(TargetType.ROLE, role.id())));
    }

    /** Rank of the highest role the user holds, roles.size() without roles and -1 for the owner. */
    public synchronized int bestRank(String userId) {
        if (owner(userId)) {
            return -1;
        }

        var member = members.get(userId);
        var best = roles.size();

        if (member == null) {
            return best;
        }

        for (var i = 0; i < roles.size(); i++) {
            if (member.roleIds().contains(roles.get(i).id())) {
                return Math.min(best, i);
            }
        }

        return best;
    }

    private void redistribute() {
        var values = PowerDistribution.distribute(roles.size());

        for (var i = 0; i < values.length; i++) {
            roles.get(i).autoPower(values[i]);
        }
    }

    // categories and channels

    public synchronized Category addCategory(String name) {
        var category = new Category(UUID.randomUUID().toString(), name);

        categories.put(category.id(), category);
        return category;
    }

    public synchronized Optional<Category> category(String categoryId) {
        return Optional.ofNullable(categories.get(categoryId));
    }

    public synchronized List<Category> categories() {
        return List.copyOf(categories.values());
    }

    public synchronized Channel addChannel(String categoryId, String name, ConversationMode mode) {
        var channel = new Channel(UUID.randomUUID().toString(), categoryId, name, mode, System.currentTimeMillis());

        channels.put(channel.id(), channel);
        return channel;
    }

    public synchronized Optional<Channel> channel(String channelId) {
        return Optional.ofNullable(channels.get(channelId));
    }

    public synchronized List<Channel> channels() {
        return List.copyOf(channels.values());
    }

    // members, invites, bans

    public synchronized Member addMember(String userId) {
        var member = new Member(userId, System.currentTimeMillis());

        members.put(userId, member);
        return member;
    }

    public synchronized Optional<Member> member(String userId) {
        return Optional.ofNullable(members.get(userId));
    }

    public synchronized List<Member> members() {
        return List.copyOf(members.values());
    }

    public synchronized boolean removeMember(String userId) {
        return members.remove(userId) != null;
    }

    public synchronized Invite addInvite(String code, int maxUses) {
        var invite = new Invite(code, maxUses);

        invites.put(code, invite);
        return invite;
    }

    public synchronized Optional<Invite> invite(String code) {
        return Optional.ofNullable(invites.get(code));
    }

    public synchronized boolean banned(String userId) {
        return bans.contains(userId);
    }

    public synchronized void ban(String userId) {
        bans.add(userId);
    }

    public synchronized boolean unban(String userId) {
        return bans.remove(userId);
    }

    // permissions

    public synchronized Map<Permission, TriState> defaults() {
        return Map.copyOf(defaults);
    }

    public synchronized void defaultState(Permission permission, TriState state) {
        if (state == TriState.INHERIT) {
            defaults.remove(permission);
        } else {
            defaults.put(permission, state);
        }
    }

    public synchronized void override(ScopeType scope, String scopeId, Target target, Permission permission, TriState state) {
        var targets = overrides.computeIfAbsent(key(scope, scopeId), key -> new HashMap<>());
        var permissions = targets.computeIfAbsent(target, key -> new EnumMap<>(Permission.class));

        if (state == TriState.INHERIT) {
            permissions.remove(permission);
        } else {
            permissions.put(permission, state);
        }
    }

    public synchronized Map<Permission, TriState> rolePermissions(String roleId) {
        var targets = overrides.get(key(ScopeType.SPACE, id));
        var permissions = targets == null ? null : targets.get(new Target(TargetType.ROLE, roleId));

        return permissions == null ? Map.of() : Map.copyOf(permissions);
    }

    /** Scopes that apply to a channel, broad to narrow. Without a channel only the space scope applies. */
    public synchronized List<PermissionScope> scopes(Channel channel) {
        var scopes = new ArrayList<PermissionScope>();

        scopes.add(scope(ScopeType.SPACE, id, name));

        if (channel == null) {
            return scopes;
        }

        if (channel.categoryId() != null && categories.containsKey(channel.categoryId())) {
            scopes.add(scope(ScopeType.CATEGORY, channel.categoryId(), categories.get(channel.categoryId()).name()));
        }

        scopes.add(scope(ScopeType.CHANNEL, channel.id(), channel.name()));
        return scopes;
    }

    public synchronized boolean scopeExists(ScopeType scope, String scopeId) {
        return switch (scope) {
            case SPACE -> id.equals(scopeId);
            case CATEGORY -> categories.containsKey(scopeId);
            case CHANNEL -> channels.containsKey(scopeId);
        };
    }

    public synchronized PermissionSubject subject(String userId) {
        var member = members.get(userId);
        var refs = new ArrayList<PermissionSubject.RoleRef>();

        if (member != null) {
            for (var role : roles) {
                if (member.roleIds().contains(role.id())) {
                    refs.add(new PermissionSubject.RoleRef(role.id(), role.name()));
                }
            }
        }

        return new PermissionSubject(userId, owner(userId), refs);
    }

    private PermissionScope scope(ScopeType type, String scopeId, String scopeName) {
        var targets = overrides.getOrDefault(key(type, scopeId), Map.of());
        var copy = new HashMap<Target, Map<Permission, TriState>>();

        targets.forEach((target, permissions) -> copy.put(target, Map.copyOf(permissions)));
        return new PermissionScope(type, scopeId, scopeName, copy);
    }

    private static String key(ScopeType scope, String scopeId) {
        return scope + ":" + scopeId;
    }

    // audit

    public synchronized void audit(String action, String actorId, String targetId, String detail) {
        audit.add(new AuditEntry(++auditSequence, action, actorId, targetId, detail, System.currentTimeMillis()));

        if (audit.size() > MAX_AUDIT_ENTRIES) {
            audit.removeFirst();
        }
    }

    /** Newest first. */
    public synchronized List<AuditEntry> audit(int limit) {
        var entries = new ArrayList<>(audit);

        java.util.Collections.reverse(entries);
        return List.copyOf(entries.subList(0, Math.min(limit, entries.size())));
    }

    public synchronized void rename(String name) {
        this.name = name;
    }
}
