package talk.phreox.space;

import java.util.Map;

/**
 * @param audience   host under which this node is registered at phreox-service, tokens are only valid for it
 * @param serviceKey Base64 Ed25519 public key of phreox-service, enables token authentication
 * @param serviceUrl base URL to fetch the service key from when it is not pinned
 */
public record SpaceConfig(String host, int port, boolean devAuth, String audience, String serviceKey, String serviceUrl) {

    public static final String HOST_VARIABLE = "PHREOX_SPACE_HOST";
    public static final String PORT_VARIABLE = "PHREOX_SPACE_PORT";
    public static final String DEV_AUTH_VARIABLE = "PHREOX_SPACE_DEV_AUTH";
    public static final String AUDIENCE_VARIABLE = "PHREOX_SPACE_AUDIENCE";
    public static final String SERVICE_KEY_VARIABLE = "PHREOX_SPACE_SERVICE_KEY";
    public static final String SERVICE_URL_VARIABLE = "PHREOX_SPACE_SERVICE_URL";

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

        audience = blankToNull(audience);
        serviceKey = blankToNull(serviceKey);
        serviceUrl = blankToNull(serviceUrl);

        if (devAuth && (serviceKey != null || serviceUrl != null)) {
            throw new IllegalArgumentException(DEV_AUTH_VARIABLE + " must not be combined with service token authentication");
        }

        if ((serviceKey != null || serviceUrl != null) && audience == null) {
            throw new IllegalArgumentException(AUDIENCE_VARIABLE + " is required for service token authentication");
        }
    }

    public SpaceConfig(String host, int port, boolean devAuth) {
        this(host, port, devAuth, null, null, null);
    }

    public boolean tokenAuth() {
        return serviceKey != null;
    }

    public SpaceConfig withServiceKey(String key) {
        return new SpaceConfig(host, port, devAuth, audience, key, null);
    }

    public static SpaceConfig fromEnvironment(Map<String, String> environment) {
        var host = environment.getOrDefault(HOST_VARIABLE, DEFAULT_HOST);
        var devAuth = "true".equalsIgnoreCase(environment.getOrDefault(DEV_AUTH_VARIABLE, "false").trim());

        return new SpaceConfig(host.trim(), port(environment.get(PORT_VARIABLE)), devAuth, environment.get(AUDIENCE_VARIABLE),
                environment.get(SERVICE_KEY_VARIABLE), environment.get(SERVICE_URL_VARIABLE));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
