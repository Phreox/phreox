package talk.phreox.space.guild;

import java.util.LinkedHashSet;
import java.util.Set;

public final class Member {

    private final String userId;
    private final long joinedAt;
    private final Set<String> roleIds = new LinkedHashSet<>();

    private long mutedUntil;

    Member(String userId, long joinedAt) {
        this.userId = userId;
        this.joinedAt = joinedAt;
    }

    public String userId() {
        return userId;
    }

    public long joinedAt() {
        return joinedAt;
    }

    public Set<String> roleIds() {
        return roleIds;
    }

    public long mutedUntil() {
        return mutedUntil;
    }

    public void mutedUntil(long mutedUntil) {
        this.mutedUntil = mutedUntil;
    }

    public boolean muted(long now) {
        return mutedUntil > now;
    }
}
