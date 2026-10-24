package talk.phreox.service.auth;

import java.util.UUID;

public record Account(UUID id, String username, String passwordHash, long createdAt) {

    @Override
    public String toString() {
        return "Account[id=" + id + ", username=" + username + "]";
    }
}
