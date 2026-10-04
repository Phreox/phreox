package talk.phreox.backend.bridge;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public record BridgeConfig(int port, String token, Set<String> allowedOrigins, boolean generatedToken) {

    public static final String HOST = "127.0.0.1";

    public static final String TOKEN_VARIABLE = "PHREOX_BRIDGE_TOKEN";
    public static final String PORT_VARIABLE = "PHREOX_BRIDGE_PORT";
    public static final String ORIGINS_VARIABLE = "PHREOX_BRIDGE_ORIGINS";

    private static final int DEFAULT_PORT = 8080;
    private static final String DEFAULT_ORIGINS = "http://localhost:5173";
    private static final int MIN_TOKEN_LENGTH = 32;
    private static final int TOKEN_BYTES = 32;
    private static final int MAX_PORT = 0xFFFF;

    public BridgeConfig {
        if (token == null || token.length() < MIN_TOKEN_LENGTH) {
            throw new IllegalArgumentException("Bridge token must have at least " + MIN_TOKEN_LENGTH + " characters");
        }

        if (port < 1 || port > MAX_PORT) {
            throw new IllegalArgumentException("Invalid bridge port: " + port);
        }

        allowedOrigins = Set.copyOf(allowedOrigins);
    }

    public static BridgeConfig fromEnvironment(Map<String, String> environment) {
        var port = port(environment.get(PORT_VARIABLE));
        var origins = origins(environment.getOrDefault(ORIGINS_VARIABLE, DEFAULT_ORIGINS));
        var token = environment.get(TOKEN_VARIABLE);

        if (token == null || token.isBlank()) {
            return new BridgeConfig(port, generateToken(), origins, true);
        }

        return new BridgeConfig(port, token, origins, false);
    }

    @Override
    public String toString() {
        return "BridgeConfig[port=" + port + ", allowedOrigins=" + allowedOrigins + ", token=***]";
    }

    private static int port(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_PORT;
        }

        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid " + PORT_VARIABLE + ": " + value);
        }
    }

    private static Set<String> origins(String value) {
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    private static String generateToken() {
        var bytes = new byte[TOKEN_BYTES];
        new SecureRandom().nextBytes(bytes);

        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
