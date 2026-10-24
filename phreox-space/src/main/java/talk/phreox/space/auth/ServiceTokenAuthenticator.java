package talk.phreox.space.auth;

import talk.phreox.api.SpaceAccessToken;

import java.time.Clock;

/** Accepts "Bearer px1..." tokens issued by phreox-service for this node's host. The user id is the account id. */
public final class ServiceTokenAuthenticator implements Authenticator {

    private static final String BEARER_PREFIX = "Bearer ";

    private final String serviceKey;
    private final String audience;
    private final Clock clock;

    public ServiceTokenAuthenticator(String serviceKey, String audience, Clock clock) {
        this.serviceKey = serviceKey;
        this.audience = audience;
        this.clock = clock;
    }

    @Override
    public String authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            return null;
        }

        return SpaceAccessToken.verify(authorization.substring(BEARER_PREFIX.length()), serviceKey, audience, clock.millis())
                .map(token -> token.accountId().toString())
                .orElse(null);
    }
}
