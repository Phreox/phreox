package talk.phreox.backend.bridge;

import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.UnauthorizedResponse;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

/** Protects the local bridge against other local processes, browser pages and DNS rebinding. */
public final class BridgeGuard {

    private static final String HOST_HEADER = "Host";
    private static final String ORIGIN_HEADER = "Origin";
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    public enum Verdict {
        ALLOWED,
        FORBIDDEN_HOST,
        FORBIDDEN_ORIGIN,
        UNAUTHORIZED
    }

    private final Set<String> allowedHosts;
    private final Set<String> allowedOrigins;
    private final byte[] token;

    public BridgeGuard(BridgeConfig config) {
        allowedHosts = Set.of(BridgeConfig.HOST + ":" + config.port(), "localhost:" + config.port());
        allowedOrigins = config.allowedOrigins();
        token = config.token().getBytes(StandardCharsets.UTF_8);
    }

    public void check(Context context) {
        var verdict = verdict(context.header(HOST_HEADER), context.header(ORIGIN_HEADER), context.header(AUTHORIZATION_HEADER));

        switch (verdict) {
            case ALLOWED -> {
            }
            case FORBIDDEN_HOST -> throw new ForbiddenResponse("Host not allowed");
            case FORBIDDEN_ORIGIN -> throw new ForbiddenResponse("Origin not allowed");
            case UNAUTHORIZED -> throw new UnauthorizedResponse();
        }
    }

    public Verdict verdict(String host, String origin, String authorization) {
        if (host == null || !allowedHosts.contains(host)) {
            return Verdict.FORBIDDEN_HOST;
        }

        // Requests without Origin come from non-browser clients such as the Electron main process.
        if (origin != null && !allowedOrigins.contains(origin)) {
            return Verdict.FORBIDDEN_ORIGIN;
        }

        if (!authorized(authorization)) {
            return Verdict.UNAUTHORIZED;
        }

        return Verdict.ALLOWED;
    }

    private boolean authorized(String authorization) {
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            return false;
        }

        var presented = authorization.substring(BEARER_PREFIX.length()).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(token, presented);
    }
}
