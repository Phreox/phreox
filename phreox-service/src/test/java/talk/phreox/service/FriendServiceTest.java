package talk.phreox.service;

import org.junit.jupiter.api.Test;
import talk.phreox.api.ServiceApi.FriendStatus;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.friend.FriendService;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FriendServiceTest {

    private final FriendService friends = new FriendService();
    private final UUID alice = UUID.randomUUID();
    private final UUID bob = UUID.randomUUID();

    @Test
    void requestThenAcceptMakesFriends() {
        assertEquals(FriendStatus.OUTGOING, friends.request(alice, bob));
        assertEquals(FriendStatus.INCOMING, friends.list(bob).getFirst().status());
        assertFalse(friends.areFriends(alice, bob));

        friends.accept(bob, alice);

        assertTrue(friends.areFriends(alice, bob));
        assertTrue(friends.areFriends(bob, alice));
        assertEquals(FriendStatus.FRIENDS, friends.list(alice).getFirst().status());
    }

    @Test
    void crossRequestAcceptsAutomatically() {
        friends.request(alice, bob);

        assertEquals(FriendStatus.FRIENDS, friends.request(bob, alice));
        assertTrue(friends.areFriends(alice, bob));
    }

    @Test
    void requesterCannotAcceptOwnRequest() {
        friends.request(alice, bob);

        assertThrows(ApiException.class, () -> friends.accept(alice, bob));
    }

    @Test
    void declineRemovesRequest() {
        friends.request(alice, bob);
        friends.decline(bob, alice);

        assertTrue(friends.list(alice).isEmpty());
        assertThrows(ApiException.class, () -> friends.decline(bob, alice));
    }

    @Test
    void rejectsDuplicatesAndSelfRequests() {
        friends.request(alice, bob);

        assertThrows(ApiException.class, () -> friends.request(alice, bob));
        assertThrows(IllegalArgumentException.class, () -> friends.request(alice, alice));

        friends.accept(bob, alice);

        assertThrows(ApiException.class, () -> friends.request(bob, alice));
    }

    @Test
    void removesFriendshipAndCancelsOutgoing() {
        friends.request(alice, bob);
        friends.accept(bob, alice);
        friends.remove(bob, alice);

        assertFalse(friends.areFriends(alice, bob));

        friends.request(alice, bob);
        friends.remove(alice, bob);

        assertTrue(friends.list(bob).isEmpty());
        assertThrows(ApiException.class, () -> friends.remove(alice, bob));
    }
}
