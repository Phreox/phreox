package talk.phreox.space.permission;

import java.util.List;

public record PermissionSubject(String userId, boolean owner, List<RoleRef> roles) {

    public record RoleRef(String id, String name) {
    }

    public PermissionSubject {
        roles = List.copyOf(roles);
    }
}
