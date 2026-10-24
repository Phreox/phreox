package talk.phreox.space.auth;

import tools.jackson.databind.ObjectMapper;
import talk.phreox.api.ApiRoutes;
import talk.phreox.api.ServiceApi;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;

/** Fetches the signing key of phreox-service once at startup. Prefer pinning the key in the configuration. */
public final class ServiceKeys {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final String SERVICE_KEYS = ApiRoutes.PREFIX + "/service/keys";
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");

    private ServiceKeys() {
    }

    public static String fetch(String serviceUrl) {
        var base = URI.create(serviceUrl.trim());
        var local = "http".equals(base.getScheme()) && LOOPBACK_HOSTS.contains(base.getHost());

        if (!local && !"https".equals(base.getScheme())) {
            throw new IllegalArgumentException("Service URL must use https");
        }

        var client = HttpClient.newBuilder().connectTimeout(TIMEOUT).followRedirects(HttpClient.Redirect.NEVER).build();
        var request = HttpRequest.newBuilder(URI.create(base.getScheme() + "://" + base.getRawAuthority() + SERVICE_KEYS)).timeout(TIMEOUT).GET().build();

        try {
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new IllegalStateException("phreox-service answered HTTP " + response.statusCode());
            }

            var key = new ObjectMapper().readValue(response.body(), ServiceApi.ServiceKeyResponse.class);

            if (!"Ed25519".equals(key.algorithm()) || key.publicKey() == null) {
                throw new IllegalStateException("phreox-service advertised an unsupported key");
            }

            return key.publicKey();
        } catch (IOException exception) {
            throw new IllegalStateException("phreox-service not reachable", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while fetching the service key", exception);
        }
    }
}
