package talk.phreox.space.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import talk.phreox.api.ApiRoutes;
import talk.phreox.service.ServiceRuntime;
import talk.phreox.service.config.ServiceConfig;
import talk.phreox.space.SpaceConfig;
import talk.phreox.space.SpaceRuntime;

import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

/** phreox-service issues the token, phreox-space accepts it, end to end over HTTP. */
class ServiceTokenAuthTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String AUDIENCE = "127.0.0.1";

    private final HttpClient client = HttpClient.newHttpClient();

    private ServiceRuntime service;
    private SpaceRuntime space;
    private String serviceUrl;
    private String spaceUrl;
    private String session;

    @BeforeEach
    void start() throws Exception {
        service = new ServiceRuntime(new ServiceConfig("127.0.0.1", 0, 1000, null, null, Set.of("phreox.talk")));
        service.start();
        serviceUrl = "http://127.0.0.1:" + service.port();

        var spacePort = freePort();
        var config = new SpaceConfig("127.0.0.1", spacePort, false, AUDIENCE, null, serviceUrl).withServiceKey(ServiceKeys.fetch(serviceUrl));

        space = new SpaceRuntime(config);
        space.start();
        spaceUrl = "http://127.0.0.1:" + spacePort + ApiRoutes.PREFIX;

        post("/auth/register", "{\"username\":\"alice\",\"password\":\"correct horse battery\"}", null);
        session = JSON.readTree(post("/auth/login", "{\"username\":\"alice\",\"password\":\"correct horse battery\"}", null).body()).get("token").asString();

        var nodeKey = Base64.getEncoder().encodeToString(KeyPairGenerator.getInstance("Ed25519").generateKeyPair().getPublic().getEncoded());
        var node = post("/nodes", "{\"publicKey\":\"" + nodeKey + "\",\"endpoints\":[\"http://127.0.0.1:" + spacePort + "\"],\"capabilities\":[\"messaging\"]}", session);

        assertEquals(200, node.statusCode(), node.body());
    }

    @AfterEach
    void stop() {
        space.close();
        service.close();
    }

    @Test
    void spaceAcceptsTokenIssuedByService() throws Exception {
        var token = spaceToken(AUDIENCE);

        var created = spaceCall("POST", "/spaces", "{\"name\":\"Lounge\"}", token);
        var listed = spaceCall("GET", "/spaces", null, token);

        assertEquals(200, created.statusCode(), created.body());
        assertEquals(200, listed.statusCode());
        assertNotEquals("[]", listed.body());
    }

    @Test
    void spaceRejectsSessionTokenAndForgedTokens() throws Exception {
        var token = spaceToken(AUDIENCE);
        var tampered = token.substring(0, token.length() - 2) + (token.endsWith("AA") ? "BB" : "AA");

        assertEquals(401, spaceCall("GET", "/spaces", null, session).statusCode());
        assertEquals(401, spaceCall("GET", "/spaces", null, tampered).statusCode());
        assertEquals(401, spaceCall("GET", "/spaces", null, null).statusCode());
    }

    @Test
    void serviceOnlyIssuesTokensForRegisteredNodesWithSession() throws Exception {
        assertEquals(404, post("/auth/space-token", "{\"audience\":\"unknown.example.com\"}", session).statusCode());
        assertEquals(401, post("/auth/space-token", "{\"audience\":\"" + AUDIENCE + "\"}", null).statusCode());
        assertEquals(400, post("/auth/space-token", "{}", session).statusCode());
    }

    @Test
    void refusesDevelopmentAuthTogetherWithTokenAuth() {
        try {
            new SpaceConfig("127.0.0.1", 1, true, AUDIENCE, null, serviceUrl);
        } catch (IllegalArgumentException expected) {
            return;
        }

        throw new AssertionError("dev auth and token auth must not be combinable");
    }

    private String spaceToken(String audience) throws Exception {
        var response = post("/auth/space-token", "{\"audience\":\"" + audience + "\"}", session);

        assertEquals(200, response.statusCode(), response.body());
        return JSON.readTree(response.body()).get("token").asString();
    }

    private HttpResponse<String> post(String path, String body, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(serviceUrl + ApiRoutes.PREFIX + path)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));

        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }

        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> spaceCall(String method, String path, String body, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(spaceUrl + path)).header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));

        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }

        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static int freePort() throws Exception {
        try (var socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }
}
