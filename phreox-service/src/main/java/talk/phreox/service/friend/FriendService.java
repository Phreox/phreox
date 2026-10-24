package talk.phreox.service.friend;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Friend graph: pending requests (requester to target) and accepted friendships. */
public final class FriendService {

    public record Relation(UUID accountId, ServiceApi.FriendStatus status) {
    }

    private static final int MAX_PENDING = 100;

    private final Map<UUID, Set<UUID>> pending = new HashMap<>();
    private final Map<UUID, Set<UUID>> friends = new HashMap<>();

    /** A request to someone who already requested you accepts that request instead. */
    public synchronized ServiceApi.FriendStatus request(UUID from, UUID to) {
        if (from.equals(to)) {
            throw new IllegalArgumentException("Cannot befriend yourself");
        }

        if (areFriends(from, to)) {
            throw ApiException.conflict("Already friends");
        }

        if (targets(from).contains(to)) {
            throw ApiException.conflict("Request already sent");
        }

        if (targets(to).contains(from)) {
            accept(from, to);
            return ServiceApi.FriendStatus.FRIENDS;
        }

        if (targets(from).size() >= MAX_PENDING) {
            throw ApiException.conflict("Too many pending requests");
        }

        pending.computeIfAbsent(from, ignored -> new HashSet<>()).add(to);
        return ServiceApi.FriendStatus.OUTGOING;
    }

    public synchronized void accept(UUID me, UUID requester) {
        if (!targets(requester).remove(me)) {
            throw ApiException.notFound("No request from this account");
        }

        friends.computeIfAbsent(me, ignored -> new HashSet<>()).add(requester);
        friends.computeIfAbsent(requester, ignored -> new HashSet<>()).add(me);
    }

    public synchronized void decline(UUID me, UUID requester) {
        if (!targets(requester).remove(me)) {
            throw ApiException.notFound("No request from this account");
        }
    }

    /** Removes a friendship or cancels an own outgoing request. */
    public synchronized void remove(UUID me, UUID other) {
        if (friends.getOrDefault(me, Set.of()).contains(other)) {
            friends.get(me).remove(other);
            friends.get(other).remove(me);
            return;
        }

        if (!targets(me).remove(other)) {
            throw ApiException.notFound("No relation with this account");
        }
    }

    public synchronized boolean areFriends(UUID a, UUID b) {
        return friends.getOrDefault(a, Set.of()).contains(b);
    }

    public synchronized List<Relation> list(UUID me) {
        var relations = new ArrayList<Relation>();

        friends.getOrDefault(me, Set.of()).forEach(id -> relations.add(new Relation(id, ServiceApi.FriendStatus.FRIENDS)));
        targets(me).forEach(id -> relations.add(new Relation(id, ServiceApi.FriendStatus.OUTGOING)));
        pending.forEach((requester, targets) -> {
            if (targets.contains(me)) {
                relations.add(new Relation(requester, ServiceApi.FriendStatus.INCOMING));
            }
        });

        return relations;
    }

    private Set<UUID> targets(UUID requester) {
        return pending.computeIfAbsent(requester, ignored -> new HashSet<>());
    }
}
