package talk.phreox.service;

import org.junit.jupiter.api.Test;
import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.crypto.ServiceSigner;
import talk.phreox.service.node.NodeRegistry;

import java.security.KeyPairGenerator;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NodeRegistryTest {

    private final MutableClock clock = new MutableClock();
    private final ServiceSigner signer = ServiceSigner.generate();
    private final NodeRegistry registry = new NodeRegistry(signer, Set.of("phreox.talk"), clock);
    private final UUID owner = UUID.randomUUID();

    @Test
    void registersAndVerifiesSignedIdentity() {
        var identity = registry.register(owner, request("https://community.example.com", List.of("messaging", "guild")));

        assertTrue(registry.verify(identity).valid());
        assertEquals(List.of("guild", "messaging"), identity.capabilities());
        assertEquals(identity, registry.find(identity.nodeId()));
        assertEquals(identity, registry.findByHost("Community.Example.com"));
    }

    @Test
    void detectsManipulatedIdentity() {
        var identity = registry.register(owner, request("https://community.example.com", List.of("messaging")));

        var otherEndpoint = new ServiceApi.SpaceNodeIdentity(identity.nodeId(), identity.ownerId(), identity.publicKey(), List.of("https://evil.example.com"), identity.capabilities(), identity.expiresAt(), identity.signature());
        var moreCapabilities = new ServiceApi.SpaceNodeIdentity(identity.nodeId(), identity.ownerId(), identity.publicKey(), identity.endpoints(), List.of("messaging", "media"), identity.expiresAt(), identity.signature());
        var longer = new ServiceApi.SpaceNodeIdentity(identity.nodeId(), identity.ownerId(), identity.publicKey(), identity.endpoints(), identity.capabilities(), identity.expiresAt() + 1, identity.signature());

        assertFalse(registry.verify(otherEndpoint).valid());
        assertFalse(registry.verify(moreCapabilities).valid());
        assertFalse(registry.verify(longer).valid());
        assertFalse(registry.verify(null).valid());
    }

    @Test
    void identitySignedByAnotherServiceIsInvalid() {
        var foreign = new NodeRegistry(ServiceSigner.generate(), Set.of(), clock).register(owner, request("https://community.example.com", List.of("messaging")));

        assertFalse(registry.verify(foreign).valid());
    }

    @Test
    void expiresAndRenews() {
        var identity = registry.register(owner, request("https://community.example.com", List.of("messaging")));

        clock.advance(Duration.ofDays(31));

        assertFalse(registry.verify(identity).valid());
        assertNull(registry.find(identity.nodeId()));
        assertThrows(ApiException.class, () -> registry.renew(owner, identity.nodeId(), null));

        var fresh = registry.register(owner, request("https://community.example.com", List.of("messaging")));

        clock.advance(Duration.ofDays(29));

        var renewed = registry.renew(owner, fresh.nodeId(), null);

        assertTrue(registry.verify(renewed).valid());
        assertFalse(registry.verify(fresh).valid());
    }

    @Test
    void removedNodeIsNoLongerValid() {
        var identity = registry.register(owner, request("https://community.example.com", List.of("messaging")));

        assertThrows(ApiException.class, () -> registry.remove(UUID.randomUUID(), identity.nodeId()));

        registry.remove(owner, identity.nodeId());

        assertFalse(registry.verify(identity).valid());
        assertNull(registry.findByHost("community.example.com"));
    }

    @Test
    void hostBelongsToOneNode() {
        registry.register(owner, request("https://community.example.com", List.of("messaging")));

        assertThrows(ApiException.class, () -> registry.register(UUID.randomUUID(), request("https://community.example.com/other", List.of("messaging"))));
    }

    @Test
    void rejectsImpersonatingTheService() {
        assertThrows(ApiException.class, () -> registry.register(owner, request("https://phreox.talk", List.of("messaging"))));
        assertThrows(ApiException.class, () -> registry.register(owner, request("https://api.phreox.talk", List.of("messaging"))));
        assertThrows(ApiException.class, () -> registry.register(owner, new ServiceApi.RegisterNodeRequest(signer.publicKey(), List.of("https://community.example.com"), List.of("messaging"), null)));
        assertNotNull(registry.register(owner, request("https://notphreox.talk.example.org", List.of("messaging"))));
    }

    @Test
    void rejectsInvalidInput() {
        assertThrows(IllegalArgumentException.class, () -> registry.register(owner, request("http://community.example.com", List.of("messaging"))));
        assertThrows(IllegalArgumentException.class, () -> registry.register(owner, request("https://user@community.example.com", List.of("messaging"))));
        assertThrows(IllegalArgumentException.class, () -> registry.register(owner, request("not a url", List.of("messaging"))));
        assertThrows(IllegalArgumentException.class, () -> registry.register(owner, request("https://community.example.com", List.of("identity"))));
        assertThrows(IllegalArgumentException.class, () -> registry.register(owner, request("https://community.example.com", List.of())));
        assertThrows(IllegalArgumentException.class, () -> registry.register(owner, new ServiceApi.RegisterNodeRequest("AAAA", List.of("https://community.example.com"), List.of("messaging"), null)));
        assertThrows(IllegalArgumentException.class, () -> registry.register(owner, new ServiceApi.RegisterNodeRequest(nodeKey(), List.of("https://community.example.com"), List.of("messaging"), 0L)));
    }

    @Test
    void allowsPlainHttpOnlyOnLoopback() {
        assertNotNull(registry.register(owner, request("http://127.0.0.1:9000", List.of("messaging"))));
    }

    private static ServiceApi.RegisterNodeRequest request(String endpoint, List<String> capabilities) {
        return new ServiceApi.RegisterNodeRequest(nodeKey(), List.of(endpoint), capabilities, null);
    }

    static String nodeKey() {
        try {
            return Base64.getEncoder().encodeToString(KeyPairGenerator.getInstance("Ed25519").generateKeyPair().getPublic().getEncoded());
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
