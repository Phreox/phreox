package talk.phreox.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.api.pxp.ConversationMode;
import talk.phreox.service.crypto.ServiceSigner;
import talk.phreox.service.device.DeviceService;
import talk.phreox.service.dm.ConversationService;
import talk.phreox.service.dm.Receipts;
import talk.phreox.service.friend.FriendService;

import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConversationServiceTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    private final MutableClock clock = new MutableClock();
    private final ServiceSigner signer = ServiceSigner.generate();
    private final FriendService friends = new FriendService();
    private final DeviceService devices = new DeviceService(clock);
    private final ConversationService conversations = new ConversationService(friends, devices, signer, clock);

    private final UUID alice = UUID.randomUUID();
    private final UUID bob = UUID.randomUUID();
    private final UUID carol = UUID.randomUUID();
    private final UUID dave = UUID.randomUUID();
    private final UUID eve = UUID.randomUUID();

    private UUID aliceDevice;
    private UUID bobDevice;

    @BeforeEach
    void setUp() {
        befriend(alice, bob);
        befriend(alice, carol);
        befriend(alice, dave);

        aliceDevice = device(alice);
        bobDevice = device(bob);
    }

    @Test
    void createsPrivateDmOnlyBetweenFriends() {
        var dm = dm(alice, bob);

        assertEquals(ConversationMode.PRIVATE, dm.mode());
        assertEquals(ServiceApi.ConversationKind.DM, dm.kind());
        assertThrows(ApiException.class, () -> dm(alice, eve));
    }

    @Test
    void dmBetweenSameAccountsIsUnique() {
        assertEquals(dm(alice, bob).id(), dm(bob, alice).id());
    }

    @Test
    void outsiderCannotReadOrWrite() {
        var dm = dm(alice, bob);
        var outsiderDevice = device(eve);

        assertThrows(ApiException.class, () -> conversations.get(eve, dm.id()));
        assertThrows(ApiException.class, () -> conversations.events(eve, dm.id(), 0, 10));
        assertThrows(ApiException.class, () -> conversations.send(eve, dm.id(), send(outsiderDevice, "AQID")));
    }

    @Test
    void sendRequiresOwnActiveDevice() {
        var dm = dm(alice, bob);

        assertThrows(ApiException.class, () -> conversations.send(alice, dm.id(), send(bobDevice, "AQID")));

        devices.revoke(alice, aliceDevice);

        assertThrows(ApiException.class, () -> conversations.send(alice, dm.id(), send(aliceDevice, "AQID")));
    }

    @Test
    void rejectsInvalidCiphertext() {
        var dm = dm(alice, bob);

        assertThrows(IllegalArgumentException.class, () -> conversations.send(alice, dm.id(), send(aliceDevice, "not base64!")));
        assertThrows(IllegalArgumentException.class, () -> conversations.send(alice, dm.id(), send(aliceDevice, "")));
    }

    @Test
    void numbersEventsMonotonicallyAndPages() {
        var dm = dm(alice, bob);

        for (var i = 0; i < 5; i++) {
            assertEquals(i + 1, conversations.send(alice, dm.id(), send(aliceDevice, "AQID")).id());
        }

        var first = conversations.events(bob, dm.id(), 0, 2);
        var second = conversations.events(bob, dm.id(), first.cursor(), 10);

        assertEquals(List.of(1L, 2L), first.events().stream().map(ServiceApi.EventView::id).toList());
        assertTrue(first.hasMore());
        assertEquals(List.of(3L, 4L, 5L), second.events().stream().map(ServiceApi.EventView::id).toList());
        assertFalse(second.hasMore());
    }

    @Test
    void receiptIsSignedAndDetectsManipulation() {
        var dm = dm(alice, bob);
        var event = conversations.send(alice, dm.id(), send(aliceDevice, Base64.getEncoder().encodeToString("cipher".getBytes())));
        var receipt = event.receipt();

        assertTrue(Receipts.verify(signer.publicKey(), receipt));
        assertEquals(aliceDevice, receipt.senderDevice());

        var forgedHash = new ServiceApi.Receipt(receipt.eventId(), "AAAA", receipt.conversationId(), receipt.senderDevice(), receipt.timestamp(), receipt.signature());
        var forgedEvent = new ServiceApi.Receipt(receipt.eventId() + 1, receipt.ciphertextHash(), receipt.conversationId(), receipt.senderDevice(), receipt.timestamp(), receipt.signature());

        assertFalse(Receipts.verify(signer.publicKey(), forgedHash));
        assertFalse(Receipts.verify(signer.publicKey(), forgedEvent));
        assertFalse(Receipts.verify(ServiceSigner.generate().publicKey(), receipt));
    }

    @Test
    void groupNeedsFriendsAndNewMembersSeeOnlyLaterEvents() {
        var group = group(alice, bob, carol);

        assertThrows(ApiException.class, () -> group(alice, bob, eve));

        conversations.send(alice, group.id(), send(aliceDevice, "AQID"));
        conversations.addMember(alice, group.id(), new ServiceApi.MemberRequest(dave));
        conversations.send(alice, group.id(), send(aliceDevice, "AQID"));

        assertEquals(List.of(1L, 2L), ids(conversations.events(bob, group.id(), 0, 10)));
        assertEquals(List.of(2L), ids(conversations.events(dave, group.id(), 0, 10)));
    }

    @Test
    void onlyCreatorManagesGroupMembers() {
        var group = group(alice, bob, carol);

        assertThrows(ApiException.class, () -> conversations.addMember(bob, group.id(), new ServiceApi.MemberRequest(dave)));
        assertThrows(ApiException.class, () -> conversations.removeMember(bob, group.id(), carol));
        assertThrows(IllegalArgumentException.class, () -> conversations.addMember(alice, dm(alice, bob).id(), new ServiceApi.MemberRequest(dave)));

        conversations.removeMember(alice, group.id(), carol);

        assertThrows(ApiException.class, () -> conversations.get(carol, group.id()));
    }

    @Test
    void creatorRoleMovesWhenCreatorLeaves() {
        var group = group(alice, bob, carol);

        conversations.removeMember(alice, group.id(), alice);

        assertEquals(bob, conversations.get(bob, group.id()).creatorId());
    }

    private ServiceApi.ConversationView dm(UUID creator, UUID other) {
        return conversations.create(creator, new ServiceApi.CreateConversationRequest(ServiceApi.ConversationKind.DM, List.of(other)));
    }

    private ServiceApi.ConversationView group(UUID creator, UUID... others) {
        return conversations.create(creator, new ServiceApi.CreateConversationRequest(ServiceApi.ConversationKind.GROUP, List.of(others)));
    }

    private ServiceApi.SendEventRequest send(UUID device, String ciphertext) {
        return new ServiceApi.SendEventRequest(device, ciphertext);
    }

    private UUID device(UUID account) {
        return devices.register(account, new ServiceApi.RegisterDeviceRequest("laptop", KEY, KEY, List.of())).id();
    }

    private void befriend(UUID a, UUID b) {
        friends.request(a, b);
        friends.accept(b, a);
    }

    private static List<Long> ids(ServiceApi.EventPage page) {
        return page.events().stream().map(ServiceApi.EventView::id).toList();
    }
}
