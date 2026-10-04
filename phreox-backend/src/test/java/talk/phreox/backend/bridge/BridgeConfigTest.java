package talk.phreox.backend.bridge;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BridgeConfigTest {

    private static final String TOKEN = "test-token-0123456789abcdef0123456789abcdef";

    @Test
    void generatesTokenWhenNoneIsProvided() {
        var first = BridgeConfig.fromEnvironment(Map.of());
        var second = BridgeConfig.fromEnvironment(Map.of());

        assertTrue(first.generatedToken());
        assertEquals(8080, first.port());
        assertEquals(Set.of("http://localhost:5173"), first.allowedOrigins());
        assertNotEquals(first.token(), second.token());
    }

    @Test
    void readsEnvironment() {
        var config = BridgeConfig.fromEnvironment(Map.of(
                BridgeConfig.TOKEN_VARIABLE, TOKEN,
                BridgeConfig.PORT_VARIABLE, "18080",
                BridgeConfig.ORIGINS_VARIABLE, "app://phreox, http://localhost:5173,"));

        assertFalse(config.generatedToken());
        assertEquals(TOKEN, config.token());
        assertEquals(18080, config.port());
        assertEquals(Set.of("app://phreox", "http://localhost:5173"), config.allowedOrigins());
    }

    @Test
    void rejectsShortToken() {
        assertThrows(IllegalArgumentException.class, () -> BridgeConfig.fromEnvironment(Map.of(BridgeConfig.TOKEN_VARIABLE, "short")));
    }

    @Test
    void rejectsInvalidPort() {
        assertThrows(IllegalArgumentException.class, () -> BridgeConfig.fromEnvironment(Map.of(BridgeConfig.PORT_VARIABLE, "abc")));
        assertThrows(IllegalArgumentException.class, () -> BridgeConfig.fromEnvironment(Map.of(BridgeConfig.PORT_VARIABLE, "70000")));
    }

    @Test
    void hidesTokenInToString() {
        var config = new BridgeConfig(8080, TOKEN, Set.of(), false);

        assertFalse(config.toString().contains(TOKEN));
    }
}
