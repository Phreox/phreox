package talk.phreox.service.dm;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.api.pxp.ConversationMode;
import talk.phreox.service.Validation;
import talk.phreox.service.crypto.ServiceSigner;
import talk.phreox.service.crypto.Tokens;
import talk.phreox.service.device.DeviceService;
import talk.phreox.service.friend.FriendService;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * DMs and group DMs are PRIVATE conversations: the service routes ciphertext and knows membership,
 * but has no field for plaintext. New members only see events after their join.
 */
public final class ConversationService {

    private static final int MAX_GROUP_MEMBERS = 50;
    private static final int MIN_GROUP_OTHERS = 2;
    private static final int MAX_CIPHERTEXT_BYTES = 1024 * 1024;
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;

    private static final class Conversation {

        final UUID id = UUID.randomUUID();
        final ServiceApi.ConversationKind kind;
        final long createdAt;
        UUID creatorId;
        /** Member to the last event id before the member joined. */
        final Map<UUID, Long> members = new LinkedHashMap<>();
        final List<ServiceApi.EventView> events = new ArrayList<>();

        Conversation(ServiceApi.ConversationKind kind, UUID creatorId, long createdAt) {
            this.kind = kind;
            this.creatorId = creatorId;
            this.createdAt = createdAt;
        }

        ServiceApi.ConversationView view() {
            return new ServiceApi.ConversationView(id, kind, ConversationMode.PRIVATE, creatorId, List.copyOf(members.keySet()), createdAt);
        }
    }

    private final Map<UUID, Conversation> conversations = new ConcurrentHashMap<>();
    private final Map<String, UUID> directMessages = new ConcurrentHashMap<>();
    private final FriendService friends;
    private final DeviceService devices;
    private final ServiceSigner signer;
    private final Clock clock;

    public ConversationService(FriendService friends, DeviceService devices, ServiceSigner signer, Clock clock) {
        this.friends = friends;
        this.devices = devices;
        this.signer = signer;
        this.clock = clock;
    }

    /** A DM between the same two accounts exists only once, creating it again returns the existing one. */
    public ServiceApi.ConversationView create(UUID creator, ServiceApi.CreateConversationRequest request) {
        if (request == null || request.kind() == null || request.members() == null) {
            throw new IllegalArgumentException("kind and members are required");
        }

        var others = new LinkedHashSet<>(request.members());
        others.remove(creator);

        if (others.contains(null)) {
            throw new IllegalArgumentException("members must not contain null");
        }

        others.forEach(other -> requireFriend(creator, other));

        return switch (request.kind()) {
            case DM -> direct(creator, others);
            case GROUP -> group(creator, others);
        };
    }

    public List<ServiceApi.ConversationView> list(UUID me) {
        return conversations.values().stream()
                .map(conversation -> {
                    synchronized (conversation) {
                        return conversation.members.containsKey(me) ? conversation.view() : null;
                    }
                })
                .filter(view -> view != null)
                .sorted((a, b) -> Long.compare(a.createdAt(), b.createdAt()))
                .toList();
    }

    public ServiceApi.ConversationView get(UUID me, UUID conversationId) {
        var conversation = member(me, conversationId);

        synchronized (conversation) {
            return conversation.view();
        }
    }

    public ServiceApi.ConversationView addMember(UUID me, UUID conversationId, ServiceApi.MemberRequest request) {
        var conversation = member(me, conversationId);

        if (request == null || request.accountId() == null) {
            throw new IllegalArgumentException("accountId is missing");
        }

        synchronized (conversation) {
            requireGroup(conversation);
            requireMember(conversation, me);

            if (!conversation.creatorId.equals(me)) {
                throw ApiException.forbidden("Only the creator can add members");
            }

            requireFriend(me, request.accountId());

            if (conversation.members.containsKey(request.accountId())) {
                throw ApiException.conflict("Already a member");
            }

            if (conversation.members.size() >= MAX_GROUP_MEMBERS) {
                throw ApiException.conflict("Group is full");
            }

            conversation.members.put(request.accountId(), (long) conversation.events.size());
            return conversation.view();
        }
    }

    /** Members can leave, the creator can remove others. The creator role passes to the longest member when the creator leaves. */
    public void removeMember(UUID me, UUID conversationId, UUID accountId) {
        var conversation = member(me, conversationId);

        synchronized (conversation) {
            requireGroup(conversation);
            requireMember(conversation, me);

            if (!me.equals(accountId) && !conversation.creatorId.equals(me)) {
                throw ApiException.forbidden("Only the creator can remove other members");
            }

            if (conversation.members.remove(accountId) == null) {
                throw ApiException.notFound("Not a member");
            }

            if (conversation.members.isEmpty()) {
                conversations.remove(conversation.id);
            } else if (conversation.creatorId.equals(accountId)) {
                conversation.creatorId = conversation.members.keySet().iterator().next();
            }
        }
    }

    public ServiceApi.EventView send(UUID me, UUID conversationId, ServiceApi.SendEventRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is missing");
        }

        var conversation = member(me, conversationId);
        var bytes = Validation.base64(request.ciphertext(), "ciphertext", MAX_CIPHERTEXT_BYTES);
        var device = devices.requireActive(me, request.deviceId());

        synchronized (conversation) {
            requireMember(conversation, me);

            var eventId = conversation.events.size() + 1L;
            var timestamp = clock.millis();
            var hash = Base64.getEncoder().encodeToString(Tokens.sha256(bytes));
            var receipt = Receipts.issue(signer, eventId, hash, conversation.id, device.id(), timestamp);
            var event = new ServiceApi.EventView(eventId, conversation.id, me, device.id(), request.ciphertext(), timestamp, receipt);

            conversation.events.add(event);
            return event;
        }
    }

    /** Events after the cursor, but never before the member's join. */
    public ServiceApi.EventPage events(UUID me, UUID conversationId, long after, int limit) {
        if (after < 0) {
            throw new IllegalArgumentException("after must not be negative");
        }

        var conversation = member(me, conversationId);
        var size = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);

        synchronized (conversation) {
            var joined = conversation.members.get(me);

            if (joined == null) {
                throw ApiException.notFound("Conversation not found");
            }

            var start = (int) Math.min(Math.max(after, joined), conversation.events.size());
            var end = Math.min(start + size, conversation.events.size());
            var page = List.copyOf(conversation.events.subList(start, end));

            return new ServiceApi.EventPage(page, end < conversation.events.size(), page.isEmpty() ? Math.max(after, joined) : page.getLast().id());
        }
    }

    private ServiceApi.ConversationView direct(UUID creator, LinkedHashSet<UUID> others) {
        if (others.size() != 1) {
            throw new IllegalArgumentException("A DM needs exactly one other member");
        }

        var other = others.iterator().next();
        var key = creator.compareTo(other) < 0 ? creator + ":" + other : other + ":" + creator;
        var id = directMessages.computeIfAbsent(key, ignored -> {
            var conversation = new Conversation(ServiceApi.ConversationKind.DM, creator, clock.millis());

            conversation.members.put(creator, 0L);
            conversation.members.put(other, 0L);
            conversations.put(conversation.id, conversation);

            return conversation.id;
        });

        return get(creator, id);
    }

    private ServiceApi.ConversationView group(UUID creator, LinkedHashSet<UUID> others) {
        if (others.size() < MIN_GROUP_OTHERS || others.size() >= MAX_GROUP_MEMBERS) {
            throw new IllegalArgumentException("A group needs " + MIN_GROUP_OTHERS + " to " + (MAX_GROUP_MEMBERS - 1) + " other members");
        }

        var conversation = new Conversation(ServiceApi.ConversationKind.GROUP, creator, clock.millis());

        conversation.members.put(creator, 0L);
        others.forEach(other -> conversation.members.put(other, 0L));
        conversations.put(conversation.id, conversation);

        return conversation.view();
    }

    private void requireFriend(UUID me, UUID other) {
        if (!friends.areFriends(me, other)) {
            throw ApiException.forbidden("Conversations are only possible with friends");
        }
    }

    /** Unknown conversation and missing membership look the same. */
    private Conversation member(UUID me, UUID conversationId) {
        var conversation = conversations.get(conversationId);

        if (conversation == null) {
            throw ApiException.notFound("Conversation not found");
        }

        synchronized (conversation) {
            requireMember(conversation, me);
        }

        return conversation;
    }

    private static void requireMember(Conversation conversation, UUID me) {
        if (!conversation.members.containsKey(me)) {
            throw ApiException.notFound("Conversation not found");
        }
    }

    private static void requireGroup(Conversation conversation) {
        if (conversation.kind != ServiceApi.ConversationKind.GROUP) {
            throw new IllegalArgumentException("Members of a DM cannot be changed");
        }
    }
}
