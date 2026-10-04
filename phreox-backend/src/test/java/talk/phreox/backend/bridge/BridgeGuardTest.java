package talk.phreox.backend.bridge;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BridgeGuardTest {

    private static final String TOKEN = "test-token-0123456789abcdef0123456789abcdef";
    private static final String BEARER = "Bearer " + TOKEN;
    private static final String HOST = "127.0.0.1:8080";
    private static final String ORIGIN = "http://localhost:5173";

    private final BridgeGuard guard = new BridgeGuard(new BridgeConfig(8080, TOKEN, Set.of(ORIGIN), false));

    @Test
    void allowsAppRequest() {
        assertEquals(BridgeGuard.Verdict.ALLOWED, guard.verdict(HOST, ORIGIN, BEARER));
    }

    @Test
    void allowsNonBrowserRequestWithoutOrigin() {
        assertEquals(BridgeGuard.Verdict.ALLOWED, guard.verdict("localhost:8080", null, BEARER));
    }

    @Test
    void rejectsReboundHost() {
        assertEquals(BridgeGuard.Verdict.FORBIDDEN_HOST, guard.verdict("evil.example:8080", ORIGIN, BEARER));
    }

    @Test
    void rejectsMissingHost() {
        assertEquals(BridgeGuard.Verdict.FORBIDDEN_HOST, guard.verdict(null, ORIGIN, BEARER));
    }

    @Test
    void rejectsHostOnOtherPort() {
        assertEquals(BridgeGuard.Verdict.FORBIDDEN_HOST, guard.verdict("127.0.0.1:9090", ORIGIN, BEARER));
    }

    @Test
    void rejectsForeignOrigin() {
        assertEquals(BridgeGuard.Verdict.FORBIDDEN_ORIGIN, guard.verdict(HOST, "https://evil.example", BEARER));
    }

    @Test
    void rejectsNullOriginOfSandboxedFrames() {
        assertEquals(BridgeGuard.Verdict.FORBIDDEN_ORIGIN, guard.verdict(HOST, "null", BEARER));
    }

    @Test
    void rejectsMissingToken() {
        assertEquals(BridgeGuard.Verdict.UNAUTHORIZED, guard.verdict(HOST, ORIGIN, null));
    }

    @Test
    void rejectsWrongToken() {
        assertEquals(BridgeGuard.Verdict.UNAUTHORIZED, guard.verdict(HOST, ORIGIN, "Bearer wrong"));
    }

    @Test
    void rejectsTokenWithoutBearerScheme() {
        assertEquals(BridgeGuard.Verdict.UNAUTHORIZED, guard.verdict(HOST, ORIGIN, TOKEN));
    }
}
