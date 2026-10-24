package talk.phreox.backend.bridge;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import talk.phreox.backend.app.AppRuntime;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BridgeIntegrationTest {

    private static final String TOKEN = "test-token-0123456789abcdef0123456789abcdef";

    private final HttpClient client = HttpClient.newHttpClient();

    private AppRuntime runtime;
    private String baseUrl;

    @BeforeEach
    void startRuntime() throws IOException {
        var port = freePort();

        runtime = new AppRuntime(new BridgeConfig(port, TOKEN, Set.of("http://localhost:5173"), false));
        runtime.start();
        baseUrl = "http://127.0.0.1:" + port + "/api/v1";
    }

    @AfterEach
    void stopRuntime() {
        runtime.close();
    }

    @Test
    void rejectsRequestWithoutToken() throws Exception {
        var response = client.send(HttpRequest.newBuilder(URI.create(baseUrl + "/backend/health")).build(), HttpResponse.BodyHandlers.ofString());

        assertEquals(401, response.statusCode());
    }

    @Test
    void reportsBackendState() throws Exception {
        var response = send(authorized("/backend/state").GET());

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"name\":\"messages\",\"status\":\"RUNNING\""));
    }

    @Test
    void sendsAndLoadsMessages() throws Exception {
        var created = send(authorized("/channels/general/messages").header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"content\":\"hallo\"}")));
        var page = send(authorized("/channels/general/messages?limit=10").GET());

        assertEquals(200, created.statusCode());
        assertEquals(200, page.statusCode());
        assertTrue(page.body().contains("\"content\":\"hallo\""));
    }

    @Test
    void editsDeletesAndReactsToMessages() throws Exception {
        var created = send(authorized("/channels/room/messages").POST(HttpRequest.BodyPublishers.ofString("{\"content\":\"alt\"}")));
        var id = created.body().replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        var edited = send(authorized("/channels/room/messages/" + id).PUT(HttpRequest.BodyPublishers.ofString("{\"content\":\"neu\"}")));
        var reacted = send(authorized("/channels/room/messages/" + id + "/reactions/ok").PUT(HttpRequest.BodyPublishers.noBody()));
        var deleted = send(authorized("/channels/room/messages/" + id).DELETE());
        var missing = send(authorized("/channels/room/messages/" + id).DELETE());

        assertTrue(edited.body().contains("\"content\":\"neu\""));
        assertTrue(reacted.body().contains("\"reactions\":[\"ok\"]"));
        assertEquals(204, deleted.statusCode());
        assertEquals(404, missing.statusCode());
    }

    @Test
    void managesSpaceConnections() throws Exception {
        var empty = send(authorized("/connections/spaces").GET());
        var service = send(authorized("/connections/service").GET());
        var rejected = send(authorized("/connections/spaces").POST(HttpRequest.BodyPublishers.ofString("{\"url\":\"http://example.com\"}")));

        assertEquals("[]", empty.body());
        assertTrue(service.body().contains("NOT_CHECKED"));
        assertEquals(400, rejected.statusCode());
    }

    @Test
    void mapsInvalidInputToBadRequest() throws Exception {
        var emptyMessage = send(authorized("/channels/general/messages").POST(HttpRequest.BodyPublishers.ofString("{\"content\":\" \"}")));
        var invalidLimit = send(authorized("/channels/general/messages?limit=abc").GET());

        assertEquals(400, emptyMessage.statusCode());
        assertEquals(400, invalidLimit.statusCode());
    }

    private HttpRequest.Builder authorized(String path) {
        return HttpRequest.newBuilder(URI.create(baseUrl + path)).header("Authorization", "Bearer " + TOKEN);
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static int freePort() throws IOException {
        try (var socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }
}
