package talk.phreox.service.config;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Admin token and key file are optional: without a token, entitlements cannot be granted. */
public record ServiceConfig(String host, int port, int passwordIterations, String adminToken, Path keyFile, Set<String> reservedDomains) {

    public static final String HOST_VARIABLE = "PHREOX_SERVICE_HOST";
    public static final String PORT_VARIABLE = "PHREOX_SERVICE_PORT";
    public static final String ADMIN_TOKEN_VARIABLE = "PHREOX_SERVICE_ADMIN_TOKEN";
    public static final String KEY_FILE_VARIABLE = "PHREOX_SERVICE_KEY_FILE";
    public static final String RESERVED_DOMAINS_VARIABLE = "PHREOX_SERVICE_RESERVED_DOMAINS";

    public static final int DEFAULT_PASSWORD_ITERATIONS = 600_000;

    private static final String DEFAULT_HOST = "127.0.0.1";
    private static final int DEFAULT_PORT = 8081;
    private static final String DEFAULT_RESERVED_DOMAINS = "phreox.talk";
    private static final int MIN_ADMIN_TOKEN_LENGTH = 32;
    private static final int MAX_PORT = 0xFFFF;

    public ServiceConfig {
        if (port < 0 || port > MAX_PORT) {
            throw new IllegalArgumentException("Invalid service port: " + port);
        }

        if (passwordIterations < 1) {
            throw new IllegalArgumentException("Invalid password iterations: " + passwordIterations);
        }

        if (adminToken != null && adminToken.length() < MIN_ADMIN_TOKEN_LENGTH) {
            throw new IllegalArgumentException("Admin token must have at least " + MIN_ADMIN_TOKEN_LENGTH + " characters");
        }

        reservedDomains = Set.copyOf(reservedDomains);
    }

    public static ServiceConfig fromEnvironment(Map<String, String> environment) {
        var token = environment.get(ADMIN_TOKEN_VARIABLE);
        var keyFile = environment.get(KEY_FILE_VARIABLE);

        return new ServiceConfig(
                environment.getOrDefault(HOST_VARIABLE, DEFAULT_HOST),
                port(environment.get(PORT_VARIABLE)),
                DEFAULT_PASSWORD_ITERATIONS,
                token == null || token.isBlank() ? null : token,
                keyFile == null || keyFile.isBlank() ? null : Path.of(keyFile),
                domains(environment.getOrDefault(RESERVED_DOMAINS_VARIABLE, DEFAULT_RESERVED_DOMAINS)));
    }

    @Override
    public String toString() {
        return "ServiceConfig[host=" + host + ", port=" + port + ", keyFile=" + keyFile + ", reservedDomains=" + reservedDomains + ", adminToken=" + (adminToken == null ? "none" : "***") + "]";
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

    private static Set<String> domains(String value) {
        return Arrays.stream(value.split(","))
                .map(domain -> domain.trim().toLowerCase(Locale.ROOT))
                .filter(domain -> !domain.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }
}
