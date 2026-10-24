package talk.phreox.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import talk.phreox.api.ApiRoutes;
import talk.phreox.api.ServiceApi;
import talk.phreox.service.config.ServiceConfig;
import talk.phreox.service.dm.Receipts;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServiceIntegrationTest {

    private static final String PASSWORD = "correct horse battery";
    private static final String ADMIN_TOKEN = "admin-token-0123456789abcdef0123456789";
    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    private ServiceRuntime runtime;
    private String baseUrl;

    @BeforeEach
    void start() {
        runtime = new ServiceRuntime(new ServiceConfig("127.0.0.1", 0, 1000, ADMIN_TOKEN, null, Set.of("phreox.talk")));
        runtime.start();
        baseUrl = "http://127.0.0.1:" + runtime.port() + ApiRoutes.PREFIX;
    }

    @AfterEach
    void stop() {
        runtime.close();
    }

    @Test
    void publishesHealthAndCapabilitiesWithoutLogin() throws Exception {
        var health = send("GET", "/health", null, null);
        var capabilities = send("GET", "/capabilities", null, null);

        assertEquals(200, health.statusCode());
        assertEquals(200, capabilities.statusCode());
        assertEquals("service", tree(capabilities).get("authority").asString());
        assertTrue(capabilities.body().contains("node-registry"));
    }

    @Test
    void protectsRoutesWithoutSession() throws Exception {
        for (var path : new String[]{"/devices", "/friends", "/conversations", "/nodes/owned", "/entitlements/me", "/auth/me"}) {
            assertEquals(401, send("GET", path, null, null).statusCode(), path);
        }

        assertEquals(401, send("GET", "/devices", null, "garbage").statusCode());
    }

    @Test
    void runsAccountDeviceFriendAndDmFlow() throws Exception {
        var alice = account("alice");
        var bob = account("bob");
        var carol = account("carol");

        var aliceDevice = device(alice.token());
        var bobDevice = device(bob.token());

        var request = send("POST", "/friends/requests", "{\"username\":\"bob\"}", alice.token());
        var accepted = send("POST", "/friends/requests/" + alice.id() + "/accept", null, bob.token());

        assertEquals(200, request.statusCode());
        assertEquals("OUTGOING", tree(request).get("status").asString());
        assertEquals("FRIENDS", tree(accepted).get("status").asString());

        var strangerDm = send("POST", "/conversations", "{\"kind\":\"DM\",\"members\":[\"" + carol.id() + "\"]}", alice.token());
        assertEquals(403, strangerDm.statusCode());

        var dm = send("POST", "/conversations", "{\"kind\":\"DM\",\"members\":[\"" + bob.id() + "\"]}", alice.token());
        var conversationId = tree(dm).get("id").asString();

        assertEquals("PRIVATE", tree(dm).get("mode").asString());

        var ciphertext = Base64.getEncoder().encodeToString("opaque mls ciphertext".getBytes());
        var sent = send("POST", "/conversations/" + conversationId + "/events", "{\"deviceId\":\"" + aliceDevice + "\",\"ciphertext\":\"" + ciphertext + "\"}", alice.token());

        assertEquals(200, sent.statusCode());
        assertFalse(sent.body().contains("opaque mls ciphertext"));

        var page = send("GET", "/conversations/" + conversationId + "/events?after=0", null, bob.token());
        var event = tree(page).get("events").get(0);

        assertEquals(ciphertext, event.get("ciphertext").asString());
        assertEquals(aliceDevice, event.get("senderDeviceId").asString());

        var key = tree(send("GET", "/service/keys", null, null)).get("publicKey").asString();
        var receipt = json.readValue(event.get("receipt").toString(), ServiceApi.Receipt.class);

        assertTrue(Receipts.verify(key, receipt));

        assertEquals(404, send("GET", "/conversations/" + conversationId + "/events", null, carol.token()).statusCode());
        assertEquals(404, send("POST", "/conversations/" + conversationId + "/events", "{\"deviceId\":\"" + bobDevice + "\",\"ciphertext\":\"" + ciphertext + "\"}", carol.token()).statusCode());
        assertEquals(400, send("POST", "/conversations/" + conversationId + "/events", "{\"deviceId\":\"" + aliceDevice + "\",\"ciphertext\":\"%%%\"}", alice.token()).statusCode());
    }

    @Test
    void claimsKeyPackagesOnlyFromFriends() throws Exception {
        var alice = account("alice");
        var bob = account("bob");
        var packageBlob = Base64.getEncoder().encodeToString("key package".getBytes());
        var device = tree(send("POST", "/devices", "{\"name\":\"pc\",\"identityKey\":\"" + KEY + "\",\"signatureKey\":\"" + KEY + "\",\"keyPackages\":[\"" + packageBlob + "\"]}", bob.token())).get("id").asString();

        assertEquals(403, send("GET", "/devices/claim/" + bob.id(), null, alice.token()).statusCode());

        send("POST", "/friends/requests", "{\"username\":\"bob\"}", alice.token());
        send("POST", "/friends/requests/" + alice.id() + "/accept", null, bob.token());

        var claim = send("GET", "/devices/claim/" + bob.id(), null, alice.token());

        assertEquals(device, tree(claim).get(0).get("deviceId").asString());
        assertEquals("[]", send("GET", "/devices/claim/" + bob.id(), null, alice.token()).body());
    }

    @Test
    void registersAndVerifiesSpaceNode() throws Exception {
        var owner = account("owner");
        var body = "{\"publicKey\":\"" + NodeRegistryTest.nodeKey() + "\",\"endpoints\":[\"https://community.example.com\"],\"capabilities\":[\"messaging\",\"guild\"]}";

        var registered = send("POST", "/nodes", body, owner.token());
        var identity = tree(registered);
        var nodeId = identity.get("nodeId").asString();

        assertEquals(200, registered.statusCode());
        assertEquals(200, send("GET", "/directory/nodes/" + nodeId, null, null).statusCode());
        assertEquals(nodeId, tree(send("GET", "/directory/nodes?host=community.example.com", null, null)).get("nodeId").asString());
        assertEquals(404, send("GET", "/directory/nodes?host=other.example.com", null, null).statusCode());

        assertTrue(tree(send("POST", "/directory/verify", identity.toString(), null)).get("valid").asBoolean());

        var forged = identity.toString().replace("community.example.com", "evil.example.com");
        assertFalse(tree(send("POST", "/directory/verify", forged, null)).get("valid").asBoolean());

        var reserved = body.replace("community.example.com", "official.phreox.talk");
        assertEquals(403, send("POST", "/nodes", reserved, owner.token()).statusCode());

        assertEquals(204, send("DELETE", "/nodes/" + nodeId, null, owner.token()).statusCode());
        assertFalse(tree(send("POST", "/directory/verify", identity.toString(), null)).get("valid").asBoolean());
    }

    @Test
    void issuesSignedEntitlementsOnlyForAdmin() throws Exception {
        var user = account("alice");
        var grant = "{\"features\":[\"profile.banner\"]}";

        assertEquals(401, send("PUT", "/entitlements/" + user.id(), grant, null).statusCode());
        assertEquals(401, send("PUT", "/entitlements/" + user.id(), grant, user.token()).statusCode());

        var admin = HttpRequest.newBuilder(URI.create(baseUrl + "/entitlements/" + user.id())).header("X-Phreox-Admin-Token", ADMIN_TOKEN).header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(grant)).build();

        assertEquals(200, client.send(admin, HttpResponse.BodyHandlers.ofString()).statusCode());

        var mine = send("GET", "/entitlements/me", null, user.token());

        assertTrue(mine.body().contains("profile.banner"));
        assertTrue(tree(send("POST", "/entitlements/verify", mine.body(), null)).get("valid").asBoolean());
        assertFalse(tree(send("POST", "/entitlements/verify", mine.body().replace("profile.banner", "profile.admin"), null)).get("valid").asBoolean());
    }

    @Test
    void mapsInvalidInputToBadRequest() throws Exception {
        assertEquals(400, send("POST", "/auth/register", "{\"username\":\"x\",\"password\":\"" + PASSWORD + "\"}", null).statusCode());
        assertEquals(400, send("POST", "/auth/register", "not json", null).statusCode());
        assertEquals(401, send("POST", "/auth/login", "{\"username\":\"nobody\",\"password\":\"" + PASSWORD + "\"}", null).statusCode());
    }

    private record Login(String id, String token) {
    }

    private Login account(String username) throws Exception {
        var body = "{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}";
        var registered = send("POST", "/auth/register", body, null);
        var session = send("POST", "/auth/login", body, null);

        assertEquals(200, registered.statusCode());
        assertEquals(200, session.statusCode());

        return new Login(tree(registered).get("id").asString(), tree(session).get("token").asString());
    }

    private String device(String token) throws Exception {
        var created = send("POST", "/devices", "{\"name\":\"pc\",\"identityKey\":\"" + KEY + "\",\"signatureKey\":\"" + KEY + "\",\"keyPackages\":[]}", token);

        assertEquals(200, created.statusCode());
        return tree(created).get("id").asString();
    }

    private JsonNode tree(HttpResponse<String> response) throws Exception {
        return json.readTree(response.body());
    }

    private HttpResponse<String> send(String method, String path, String body, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(baseUrl + path)).header("Content-Type", "application/json");

        if (token != null) {
            request.header("Authorization", token.equals("garbage") ? "Basic garbage" : "Bearer " + token);
        }

        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
