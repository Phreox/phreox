package talk.phreox.api;

import org.junit.jupiter.api.Test;

import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SpaceAccessTokenTest {

    private static final UUID ACCOUNT = UUID.fromString("0f8e2a7c-3b5d-4e61-9a2f-7c1d0b4e8a93");
    private static final long NOW = 1_000_000;

    private final java.security.KeyPair keys = keys();
    private final String publicKey = Base64.getEncoder().encodeToString(keys.getPublic().getEncoded());

    private static java.security.KeyPair keys() {
        try {
            return KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String sign(SpaceAccessToken token) throws Exception {
        var signature = Signature.getInstance("Ed25519");
        signature.initSign(keys.getPrivate());
        signature.update(token.signedBytes());

        return token.encode(Base64.getEncoder().encodeToString(signature.sign()));
    }

    @Test
    void acceptsValidTokenForItsAudience() throws Exception {
        var encoded = sign(new SpaceAccessToken(ACCOUNT, "space.example.com", NOW - 10, NOW + 1000));

        var verified = SpaceAccessToken.verify(encoded, publicKey, "space.example.com", NOW);

        assertTrue(verified.isPresent());
        assertEquals(ACCOUNT, verified.get().accountId());
    }

    @Test
    void rejectsOtherAudienceExpiredAndFutureTokens() throws Exception {
        var valid = sign(new SpaceAccessToken(ACCOUNT, "a.example.com", NOW - 10, NOW + 1000));
        var expired = sign(new SpaceAccessToken(ACCOUNT, "a.example.com", NOW - 100, NOW));
        var future = sign(new SpaceAccessToken(ACCOUNT, "a.example.com", NOW + 5, NOW + 1000));

        assertTrue(SpaceAccessToken.verify(valid, publicKey, "b.example.com", NOW).isEmpty());
        assertTrue(SpaceAccessToken.verify(expired, publicKey, "a.example.com", NOW).isEmpty());
        assertTrue(SpaceAccessToken.verify(future, publicKey, "a.example.com", NOW).isEmpty());
    }

    @Test
    void rejectsTamperedAndForeignlySignedTokens() throws Exception {
        var encoded = sign(new SpaceAccessToken(ACCOUNT, "a.example.com", NOW - 10, NOW + 1000));
        var other = Base64.getEncoder().encodeToString(KeyPairGenerator.getInstance("Ed25519").generateKeyPair().getPublic().getEncoded());
        var forged = sign(new SpaceAccessToken(UUID.randomUUID(), "a.example.com", NOW - 10, NOW + 1000));
        var swapped = forged.substring(0, forged.lastIndexOf('.')) + encoded.substring(encoded.lastIndexOf('.'));

        assertTrue(SpaceAccessToken.verify(encoded, other, "a.example.com", NOW).isEmpty());
        assertTrue(SpaceAccessToken.verify(swapped, publicKey, "a.example.com", NOW).isEmpty());
    }

    @Test
    void rejectsMalformedInputWithoutThrowing() {
        for (var garbage : new String[]{null, "", "px1.", "px1.a.b", "px1.a.b.c", "Bearer x", "px1." + "x".repeat(2000)}) {
            assertTrue(SpaceAccessToken.verify(garbage, publicKey, "a.example.com", NOW).isEmpty(), String.valueOf(garbage));
        }

        assertTrue(SpaceAccessToken.verify("px1.a.b", "not-a-key", "a.example.com", NOW).isEmpty());
    }
}
