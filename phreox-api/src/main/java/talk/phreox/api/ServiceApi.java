package talk.phreox.api;

import talk.phreox.api.pxp.ConversationMode;

import java.util.List;
import java.util.UUID;

/** Types of the phreox-service API. Key material and ciphertext are opaque Base64 blobs. */
public final class ServiceApi {

    public static final String CAPABILITY_IDENTITY = "identity";
    public static final String CAPABILITY_DEVICES = "devices";
    public static final String CAPABILITY_FRIENDS = "friends";
    public static final String CAPABILITY_DM = "dm";
    public static final String CAPABILITY_GROUP_DM = "group-dm";
    public static final String CAPABILITY_NODE_REGISTRY = "node-registry";
    public static final String CAPABILITY_DIRECTORY = "directory";
    public static final String CAPABILITY_ENTITLEMENTS = "entitlements";

    public record RegisterRequest(String username, String password) {
    }

    public record LoginRequest(String username, String password) {
    }

    public record SessionResponse(String token, UUID accountId, String username, long expiresAt) {
    }

    public record AccountView(UUID id, String username) {
    }

    public record RegisterDeviceRequest(String name, String identityKey, String signatureKey, List<String> keyPackages) {
    }

    public record DeviceView(UUID id, UUID accountId, String name, String identityKey, String signatureKey, boolean trusted, boolean revoked, long createdAt) {
    }

    public record TrustDeviceRequest(UUID trustedBy) {
    }

    public record KeyPackagesRequest(List<String> keyPackages) {
    }

    public record KeyPackageClaim(UUID deviceId, String keyPackage) {
    }

    public enum FriendStatus {
        FRIENDS,
        INCOMING,
        OUTGOING
    }

    public record FriendRequest(String username) {
    }

    public record FriendView(UUID accountId, String username, FriendStatus status) {
    }

    public enum ConversationKind {
        DM,
        GROUP
    }

    public record CreateConversationRequest(ConversationKind kind, List<UUID> members) {
    }

    public record ConversationView(UUID id, ConversationKind kind, ConversationMode mode, UUID creatorId, List<UUID> members, long createdAt) {
    }

    public record MemberRequest(UUID accountId) {
    }

    public record SendEventRequest(UUID deviceId, String ciphertext) {
    }

    /** Signed by the service over event id, ciphertext hash, conversation, sender device and timestamp. */
    public record Receipt(long eventId, String ciphertextHash, UUID conversationId, UUID senderDevice, long timestamp, String signature) {
    }

    public record EventView(long id, UUID conversationId, UUID senderAccountId, UUID senderDeviceId, String ciphertext, long createdAt, Receipt receipt) {
    }

    public record EventPage(List<EventView> events, boolean hasMore, long cursor) {
    }

    public record ServiceKeyResponse(String algorithm, String publicKey) {
    }

    public record RegisterNodeRequest(String publicKey, List<String> endpoints, List<String> capabilities, Long ttlSeconds) {
    }

    /** Signed by the service, so clients can check a space node without asking the service again. */
    public record SpaceNodeIdentity(UUID nodeId, UUID ownerId, String publicKey, List<String> endpoints, List<String> capabilities, long expiresAt, String signature) {
    }

    public record VerifyResponse(boolean valid, String reason) {
    }

    /** Capabilities of a node are advertised by the node, entitlements are proven by this signed object only. */
    public record Entitlement(UUID accountId, List<String> features, long issuedAt, long expiresAt, String signature) {
    }

    public record GrantEntitlementRequest(List<String> features, Long ttlSeconds) {
    }

    private ServiceApi() {
    }
}
