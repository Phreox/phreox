package talk.phreox.space.permission;

import java.util.Map;

public record PermissionScope(ScopeType type, String id, String name, Map<Target, Map<Permission, TriState>> overrides) {

    String label() {
        return type == ScopeType.SPACE ? "Space" : (type == ScopeType.CATEGORY ? "Category " : "Channel ") + name;
    }

    TriState state(Target target, Permission permission) {
        var permissions = overrides.get(target);

        return permissions == null ? TriState.INHERIT : permissions.getOrDefault(permission, TriState.INHERIT);
    }
}
