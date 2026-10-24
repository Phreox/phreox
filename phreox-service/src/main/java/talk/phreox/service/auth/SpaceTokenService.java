package talk.phreox.service.auth;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.SpaceAccessToken;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.crypto.ServiceSigner;
import talk.phreox.service.node.NodeRegistry;

import java.time.Clock;
import java.time.Duration;
import java.util.Locale;

public final class SpaceTokenService {

    static final Duration LIFETIME = Duration.ofMinutes(5);

    private final ServiceSigner signer;
    private final NodeRegistry registry;
    private final Clock clock;

    public SpaceTokenService(ServiceSigner signer, NodeRegistry registry, Clock clock) {
        this.signer = signer;
        this.registry = registry;
        this.clock = clock;
    }

    /** Tokens are only issued for registered nodes, so a session never ends up with an arbitrary host. */
    public ServiceApi.SpaceTokenResponse issue(Account account, String audience) {
        if (audience == null || audience.isBlank()) {
            throw new IllegalArgumentException("audience is required");
        }

        var host = audience.strip().toLowerCase(Locale.ROOT);

        if (registry.findByHost(host) == null) {
            throw ApiException.notFound("Space node is not registered");
        }

        var issuedAt = clock.millis();
        var token = new SpaceAccessToken(account.id(), host, issuedAt, issuedAt + LIFETIME.toMillis());

        return new ServiceApi.SpaceTokenResponse(token.encode(signer.sign(token.signedBytes())), token.expiresAt());
    }
}
