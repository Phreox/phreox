package talk.phreox.service.node;

import talk.phreox.api.ServerApi;
import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.crypto.Canonical;
import talk.phreox.service.crypto.ServiceSigner;

import java.net.URI;
import java.security.GeneralSecurityException;
import java.time.Clock;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Registered space nodes. The service signs each node identity, so clients can tell registered nodes
 * from impostors. Proving that the owner controls the endpoint domain is not implemented yet.
 */
public final class NodeRegistry {

    private static final String DOMAIN = "pxp-space-node-v1";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30);
    private static final Duration MAX_TTL = Duration.ofDays(90);
    private static final int MAX_ENDPOINTS = 10;
    private static final int MAX_NODES_PER_OWNER = 10;
    private static final Set<String> SPACE_CAPABILITIES = Set.of(
            ServerApi.CAPABILITY_GUILD, ServerApi.CAPABILITY_MESSAGING, ServerApi.CAPABILITY_PERMISSIONS, ServerApi.CAPABILITY_MODERATION,
            ServerApi.CAPABILITY_STORAGE, ServerApi.CAPABILITY_SEARCH, ServerApi.CAPABILITY_MEDIA);
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");

    private final Map<UUID, ServiceApi.SpaceNodeIdentity> nodes = new HashMap<>();
    private final Map<String, UUID> hosts = new HashMap<>();
    private final ServiceSigner signer;
    private final Set<String> reservedDomains;
    private final Clock clock;

    public NodeRegistry(ServiceSigner signer, Set<String> reservedDomains, Clock clock) {
        this.signer = signer;
        this.reservedDomains = Set.copyOf(reservedDomains);
        this.clock = clock;
    }

    public synchronized ServiceApi.SpaceNodeIdentity register(UUID ownerId, ServiceApi.RegisterNodeRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is missing");
        }

        purgeExpired();

        var publicKey = checkedPublicKey(request.publicKey());
        var endpoints = request.endpoints() == null ? List.<String>of() : request.endpoints().stream().distinct().toList();
        var capabilities = checkedCapabilities(request.capabilities());

        if (endpoints.isEmpty() || endpoints.size() > MAX_ENDPOINTS) {
            throw new IllegalArgumentException("A node needs 1 to " + MAX_ENDPOINTS + " endpoints");
        }

        if (nodes.values().stream().filter(node -> node.ownerId().equals(ownerId)).count() >= MAX_NODES_PER_OWNER) {
            throw ApiException.conflict("Node limit reached");
        }

        var nodeId = UUID.randomUUID();
        var claimed = endpoints.stream().map(this::claimableHost).distinct().toList();

        claimed.forEach(host -> claim(host, nodeId));

        var identity = sign(nodeId, ownerId, publicKey, endpoints, capabilities, ttl(request.ttlSeconds()));

        nodes.put(nodeId, identity);
        claimed.forEach(host -> hosts.put(host, nodeId));

        return identity;
    }

    /** Signs the identity again with a fresh expiry. */
    public synchronized ServiceApi.SpaceNodeIdentity renew(UUID ownerId, UUID nodeId, Long ttlSeconds) {
        purgeExpired();

        var node = owned(ownerId, nodeId);
        var renewed = sign(node.nodeId(), node.ownerId(), node.publicKey(), node.endpoints(), node.capabilities(), ttl(ttlSeconds));

        nodes.put(nodeId, renewed);
        return renewed;
    }

    public synchronized void remove(UUID ownerId, UUID nodeId) {
        owned(ownerId, nodeId);
        nodes.remove(nodeId);
        hosts.values().removeIf(nodeId::equals);
    }

    public synchronized List<ServiceApi.SpaceNodeIdentity> owned(UUID ownerId) {
        purgeExpired();
        return nodes.values().stream().filter(node -> node.ownerId().equals(ownerId)).toList();
    }

    /** Null for unknown and expired nodes. */
    public synchronized ServiceApi.SpaceNodeIdentity find(UUID nodeId) {
        purgeExpired();
        return nodes.get(nodeId);
    }

    public synchronized ServiceApi.SpaceNodeIdentity findByHost(String host) {
        purgeExpired();

        var id = host == null ? null : hosts.get(host.strip().toLowerCase(Locale.ROOT));
        return id == null ? null : nodes.get(id);
    }

    /** Valid means: signed by this service, not expired and still registered unchanged. */
    public synchronized ServiceApi.VerifyResponse verify(ServiceApi.SpaceNodeIdentity identity) {
        if (identity == null || identity.nodeId() == null || identity.ownerId() == null || identity.publicKey() == null || identity.endpoints() == null || identity.capabilities() == null) {
            return new ServiceApi.VerifyResponse(false, "Identity is incomplete");
        }

        if (!signer.verify(message(identity.nodeId(), identity.ownerId(), identity.publicKey(), identity.endpoints(), identity.capabilities(), identity.expiresAt()), identity.signature())) {
            return new ServiceApi.VerifyResponse(false, "Invalid signature");
        }

        if (identity.expiresAt() <= clock.millis()) {
            return new ServiceApi.VerifyResponse(false, "Identity expired");
        }

        if (!identity.equals(nodes.get(identity.nodeId()))) {
            return new ServiceApi.VerifyResponse(false, "Node is not registered or was superseded");
        }

        return new ServiceApi.VerifyResponse(true, null);
    }

    private ServiceApi.SpaceNodeIdentity sign(UUID nodeId, UUID ownerId, String publicKey, List<String> endpoints, List<String> capabilities, Duration ttl) {
        var expiresAt = clock.millis() + ttl.toMillis();
        var signature = signer.sign(message(nodeId, ownerId, publicKey, endpoints, capabilities, expiresAt));

        return new ServiceApi.SpaceNodeIdentity(nodeId, ownerId, publicKey, List.copyOf(endpoints), List.copyOf(capabilities), expiresAt, signature);
    }

    private static byte[] message(UUID nodeId, UUID ownerId, String publicKey, List<String> endpoints, List<String> capabilities, long expiresAt) {
        return Canonical.of(DOMAIN).uuid(nodeId).uuid(ownerId).text(publicKey).list(endpoints).list(capabilities).number(expiresAt).bytes();
    }

    private ServiceApi.SpaceNodeIdentity owned(UUID ownerId, UUID nodeId) {
        var node = nodes.get(nodeId);

        if (node == null || !node.ownerId().equals(ownerId)) {
            throw ApiException.notFound("Node not found");
        }

        return node;
    }

    private void purgeExpired() {
        var now = clock.millis();
        var expired = nodes.values().stream().filter(node -> node.expiresAt() <= now).map(ServiceApi.SpaceNodeIdentity::nodeId).toList();

        expired.forEach(id -> {
            nodes.remove(id);
            hosts.values().removeIf(id::equals);
        });
    }

    private void claim(String host, UUID nodeId) {
        var holder = hosts.get(host);

        if (holder != null && !holder.equals(nodeId)) {
            throw ApiException.conflict("Endpoint host is already registered by another node");
        }
    }

    private String claimableHost(String endpoint) {
        var uri = URI.create(endpoint == null ? "" : endpoint.strip());
        var host = uri.getHost() == null ? null : uri.getHost().toLowerCase(Locale.ROOT);
        var scheme = uri.getScheme();

        if (host == null || scheme == null || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Invalid endpoint: " + endpoint);
        }

        var loopback = LOOPBACK_HOSTS.contains(host);

        if (!scheme.equals("https") && !(scheme.equals("http") && loopback)) {
            throw new IllegalArgumentException("Endpoints must use https: " + endpoint);
        }

        if (reservedDomains.stream().anyMatch(domain -> host.equals(domain) || host.endsWith("." + domain))) {
            throw ApiException.forbidden("Endpoint host is reserved for Phreox");
        }

        return host;
    }

    private String checkedPublicKey(String publicKey) {
        try {
            ServiceSigner.parsePublicKey(publicKey);
        } catch (GeneralSecurityException | RuntimeException exception) {
            throw new IllegalArgumentException("publicKey must be a Base64 X.509 Ed25519 key");
        }

        if (publicKey.equals(signer.publicKey())) {
            throw ApiException.forbidden("A node cannot use the service key");
        }

        return publicKey;
    }

    private static List<String> checkedCapabilities(List<String> capabilities) {
        if (capabilities == null || capabilities.isEmpty()) {
            throw new IllegalArgumentException("A node needs at least one capability");
        }

        if (!SPACE_CAPABILITIES.containsAll(capabilities)) {
            throw new IllegalArgumentException("Unknown or service-only capability");
        }

        return capabilities.stream().distinct().sorted().toList();
    }

    private static Duration ttl(Long seconds) {
        if (seconds == null) {
            return DEFAULT_TTL;
        }

        var ttl = Duration.ofSeconds(seconds);

        if (ttl.isNegative() || ttl.isZero() || ttl.compareTo(MAX_TTL) > 0) {
            throw new IllegalArgumentException("ttlSeconds must be between 1 and " + MAX_TTL.toSeconds());
        }

        return ttl;
    }
}
