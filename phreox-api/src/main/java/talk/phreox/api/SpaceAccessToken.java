package talk.phreox.api;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Short-lived proof from phreox-service that an account may act on one space node.
 * It is bound to the node host, so a node can neither replay it elsewhere nor learn the account's session.
 * Wire format: {@code px1.<base64url payload>.<base64url Ed25519 signature>}.
 */
public record SpaceAccessToken(UUID accountId, String audience, long issuedAt, long expiresAt) {

    public static final String PREFIX = "px1.";

    private static final String DOMAIN = "phreox-space-access-v1";
    private static final String ALGORITHM = "Ed25519";
    private static final int MAX_TOKEN_LENGTH = 1024;

    public SpaceAccessToken {
        if (accountId == null || audience == null || audience.isBlank() || audience.indexOf('\n') >= 0) {
            throw new IllegalArgumentException("Invalid space access token");
        }
    }

    /** The bytes the service signs, tagged with a domain so the signature cannot be reused for anything else. */
    public byte[] signedBytes() {
        return (DOMAIN + "\n" + payload()).getBytes(StandardCharsets.UTF_8);
    }

    public String encode(String signature) {
        var encoder = Base64.getUrlEncoder().withoutPadding();

        return PREFIX + encoder.encodeToString(payload().getBytes(StandardCharsets.UTF_8)) + "." + encoder.encodeToString(Base64.getDecoder().decode(signature));
    }

    /**
     * @param publicKey Base64 X.509 Ed25519 key of phreox-service
     * @return the token when it is signed by the service, meant for this audience and not expired, otherwise empty
     */
    public static Optional<SpaceAccessToken> verify(String token, String publicKey, String audience, long now) {
        if (token == null || publicKey == null || token.length() > MAX_TOKEN_LENGTH || !token.startsWith(PREFIX)) {
            return Optional.empty();
        }

        var parts = token.substring(PREFIX.length()).split("\\.", -1);

        if (parts.length != 2) {
            return Optional.empty();
        }

        try {
            var decoder = Base64.getUrlDecoder();
            var parsed = parse(new String(decoder.decode(parts[0]), StandardCharsets.UTF_8));

            if (!parsed.audience().equals(audience) || parsed.expiresAt() <= now || parsed.issuedAt() > now) {
                return Optional.empty();
            }

            var key = KeyFactory.getInstance(ALGORITHM).generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(publicKey)));
            var verifier = Signature.getInstance(ALGORITHM);
            verifier.initVerify(key);
            verifier.update(parsed.signedBytes());

            return verifier.verify(decoder.decode(parts[1])) ? Optional.of(parsed) : Optional.empty();
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private String payload() {
        return accountId + "\n" + audience + "\n" + issuedAt + "\n" + expiresAt;
    }

    private static SpaceAccessToken parse(String payload) {
        var fields = payload.split("\n", -1);

        if (fields.length != 4) {
            throw new IllegalArgumentException("Invalid space access token");
        }

        return new SpaceAccessToken(UUID.fromString(fields[0]), fields[1], Long.parseLong(fields[2]), Long.parseLong(fields[3]));
    }
}
