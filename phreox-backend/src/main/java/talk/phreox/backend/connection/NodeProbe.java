package talk.phreox.backend.connection;

import tools.jackson.databind.ObjectMapper;
import talk.phreox.api.ApiRoutes;
import talk.phreox.api.ServerApi;
import talk.phreox.api.pxp.PxpProtocol;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;

/** Fetches the capability advertisement of a node and checks that the node claims the expected authority. */
public class NodeProbe {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");

    private final HttpClient client = HttpClient.newBuilder().connectTimeout(TIMEOUT).followRedirects(HttpClient.Redirect.NEVER).build();
    private final ObjectMapper mapper = new ObjectMapper();

    /** Plain HTTP is only accepted for loopback nodes, everything else needs TLS. */
    public static URI validate(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Node URL is empty");
        }

        URI uri;

        try {
            uri = URI.create(value.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid node URL");
        }

        var host = uri.getHost();

        if (host == null || uri.getScheme() == null || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Invalid node URL");
        }

        var secure = uri.getScheme().equals("https");
        var local = uri.getScheme().equals("http") && LOOPBACK_HOSTS.contains(host);

        if (!secure && !local) {
            throw new IllegalArgumentException("Node URL must use https");
        }

        return URI.create(uri.getScheme() + "://" + uri.getRawAuthority());
    }

    public NodeInfo probe(URI base, String expectedAuthority) {
        var request = HttpRequest.newBuilder(base.resolve(ApiRoutes.CAPABILITIES)).timeout(TIMEOUT).GET().build();

        try {
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return NodeInfo.unreachable("HTTP " + response.statusCode());
            }

            var capabilities = mapper.readValue(response.body(), ServerApi.CapabilitiesResponse.class);

            if (capabilities.protocol() != PxpProtocol.VERSION) {
                return NodeInfo.unreachable("Unsupported protocol version " + capabilities.protocol());
            }

            if (!expectedAuthority.equals(capabilities.authority())) {
                return NodeInfo.unreachable("Node is not a phreox-" + expectedAuthority);
            }

            return NodeInfo.connected(capabilities.capabilities());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return NodeInfo.unreachable("Interrupted");
        } catch (IOException | RuntimeException exception) {
            return NodeInfo.unreachable("Node not reachable");
        }
    }
}
