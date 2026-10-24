package talk.phreox.space;

import java.util.Map;

public record SpaceConfig(String host, int port, boolean devAuth) {

    public static final String HOST_VARIABLE = "PHREOX_SPACE_HOST";
    public static final String PORT_VARIABLE = "PHREOX_SPACE_PORT";
    public static final String DEV_AUTH_VARIABLE = "PHREOX_SPACE_DEV_AUTH";

    private static final String DEFAULT_HOST = "0.0.0.0";
    private static final int DEFAULT_PORT = 8082;
    private static final int MAX_PORT = 0xFFFF;

    public SpaceConfig {
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Host is empty");
        }

        if (port < 1 || port > MAX_PORT) {
            throw new IllegalArgumentException("Invalid port: " + port);
        }
    }

    public static SpaceConfig fromEnvironment(Map<String, String> environment) {
        var host = environment.getOrDefault(HOST_VARIABLE, DEFAULT_HOST);
        var devAuth = "true".equalsIgnoreCase(environment.getOrDefault(DEV_AUTH_VARIABLE, "false").trim());

        return new SpaceConfig(host.trim(), port(environment.get(PORT_VARIABLE)), devAuth);
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
}
