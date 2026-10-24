package talk.phreox.service.entitlement;

import talk.phreox.api.ServiceApi;
import talk.phreox.service.crypto.Canonical;
import talk.phreox.service.crypto.ServiceSigner;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/** Signed, short-lived proof of an account's features. A space advertising a capability proves nothing. */
public final class EntitlementService {

    private static final String DOMAIN = "pxp-entitlement-v1";
    private static final Duration VALIDITY = Duration.ofHours(24);
    private static final Duration MAX_GRANT = Duration.ofDays(3650);
    private static final Pattern FEATURE = Pattern.compile("[a-z0-9._-]{1,64}");
    private static final int MAX_FEATURES = 64;

    private record Grant(List<String> features, Long expiresAt) {
    }

    private final Map<UUID, Grant> grants = new ConcurrentHashMap<>();
    private final ServiceSigner signer;
    private final Clock clock;

    public EntitlementService(ServiceSigner signer, Clock clock) {
        this.signer = signer;
        this.clock = clock;
    }

    public void grant(UUID accountId, ServiceApi.GrantEntitlementRequest request) {
        if (request == null || request.features() == null || request.features().size() > MAX_FEATURES) {
            throw new IllegalArgumentException("features are required, at most " + MAX_FEATURES);
        }

        if (!request.features().stream().allMatch(feature -> feature != null && FEATURE.matcher(feature).matches())) {
            throw new IllegalArgumentException("Invalid feature name");
        }

        Long expiresAt = null;

        if (request.ttlSeconds() != null) {
            var ttl = Duration.ofSeconds(request.ttlSeconds());

            if (ttl.isNegative() || ttl.isZero() || ttl.compareTo(MAX_GRANT) > 0) {
                throw new IllegalArgumentException("ttlSeconds out of range");
            }

            expiresAt = clock.millis() + ttl.toMillis();
        }

        grants.put(accountId, new Grant(request.features().stream().distinct().sorted().toList(), expiresAt));
    }

    public ServiceApi.Entitlement issue(UUID accountId) {
        var now = clock.millis();
        var grant = grants.get(accountId);
        var active = grant != null && (grant.expiresAt() == null || grant.expiresAt() > now);
        var features = active ? grant.features() : List.<String>of();
        var expiresAt = now + VALIDITY.toMillis();

        if (active && grant.expiresAt() != null) {
            expiresAt = Math.min(expiresAt, grant.expiresAt());
        }

        return new ServiceApi.Entitlement(accountId, features, now, expiresAt, signer.sign(message(accountId, features, now, expiresAt)));
    }

    public ServiceApi.VerifyResponse verify(ServiceApi.Entitlement entitlement) {
        if (entitlement == null || entitlement.accountId() == null || entitlement.features() == null) {
            return new ServiceApi.VerifyResponse(false, "Entitlement is incomplete");
        }

        if (!signer.verify(message(entitlement.accountId(), entitlement.features(), entitlement.issuedAt(), entitlement.expiresAt()), entitlement.signature())) {
            return new ServiceApi.VerifyResponse(false, "Invalid signature");
        }

        if (entitlement.expiresAt() <= clock.millis()) {
            return new ServiceApi.VerifyResponse(false, "Entitlement expired");
        }

        return new ServiceApi.VerifyResponse(true, null);
    }

    private static byte[] message(UUID accountId, List<String> features, long issuedAt, long expiresAt) {
        return Canonical.of(DOMAIN).uuid(accountId).list(features).number(issuedAt).number(expiresAt).bytes();
    }
}
