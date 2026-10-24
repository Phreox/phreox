package talk.phreox.space.guild;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import talk.phreox.space.SpaceConfig;
import talk.phreox.space.SpaceRuntime;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SpaceIntegrationTest {

    private record Reply(int status, String body) {

        JsonNode json() {
            return JSON.readTree(body);
        }

        String text(String field) {
            return json().path(field).asString();
        }
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final HttpClient client = HttpClient.newHttpClient();

    private SpaceRuntime runtime;
    private String baseUrl;

    @BeforeEach
    void startRuntime() throws IOException {
        var port = freePort();

        runtime = new SpaceRuntime(new SpaceConfig("127.0.0.1", port, true));
        runtime.start();
        baseUrl = "http://127.0.0.1:" + port + "/api/v1";
    }

    @AfterEach
    void stopRuntime() {
        runtime.close();
    }

    @Test
    void healthAndCapabilitiesArePublicEverythingElseNeedsAuthentication() throws Exception {
        var health = call("GET", "/health", null, null);
        var capabilities = call("GET", "/capabilities", null, null);
        var spaces = call("GET", "/spaces", null, null);
        var forged = call("GET", "/spaces", "Bearer nobody", null);

        assertEquals(200, health.status());
        assertEquals(200, capabilities.status());
        assertEquals("space", capabilities.text("authority"));
        assertTrue(capabilities.body().contains("\"messaging\"") && capabilities.body().contains("\"permissions\""));
        assertEquals(401, spaces.status());
        assertEquals(401, forged.status());
    }

    @Test
    void failsClosedWithoutDevelopmentAuthentication() throws Exception {
        var port = freePort();

        try (var closed = new SpaceRuntime(new SpaceConfig("127.0.0.1", port, false))) {
            closed.start();

            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/spaces")).header("Authorization", "Bearer dev:alice").build();

            assertEquals(401, client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
        }
    }

    @Test
    void messagingEndToEndWithPermissionsAndExplain() throws Exception {
        var space = ok(call("POST", "/spaces", "alice", "{\"name\":\"BlueNet\"}"));
        var spaceId = space.text("id");
        var general = ok(call("GET", "/spaces/" + spaceId + "/channels", "alice", null)).json().get(0).path("id").asString();

        var invite = ok(call("POST", "/spaces/" + spaceId + "/invites", "alice", "{}")).text("code");
        ok(call("POST", "/invites/" + invite + "/join", "bob", null));

        var hello = ok(call("POST", "/channels/" + general + "/messages", "bob", "{\"content\":\"hallo\"}"));
        var page = ok(call("GET", "/channels/" + general + "/messages?limit=10", "alice", null));

        assertEquals("bob", hello.text("authorId"));
        assertTrue(page.body().contains("\"content\":\"hallo\""));

        // Members may not delete other people's messages, the owner may.
        var messageId = hello.text("id");
        assertEquals(404, call("DELETE", "/channels/" + general + "/messages/" + messageId, "carol", null).status());
        ok(call("POST", "/invites/" + invite + "/join", "carol", null));
        assertEquals(403, call("DELETE", "/channels/" + general + "/messages/" + messageId, "carol", null).status());
        assertEquals(204, call("DELETE", "/channels/" + general + "/messages/" + messageId, "alice", null).status());

        // Muted role: DENY at space scope beats the space default.
        var muted = ok(call("POST", "/spaces/" + spaceId + "/roles", "alice", "{\"name\":\"Muted\"}")).text("id");
        assertEquals(204, call("PUT", "/spaces/" + spaceId + "/overrides", "alice",
                "{\"scopeType\":\"SPACE\",\"targetType\":\"ROLE\",\"targetId\":\"" + muted + "\",\"permission\":\"SEND_MESSAGES\",\"state\":\"DENY\"}").status());
        ok(call("PUT", "/spaces/" + spaceId + "/members/bob/roles/" + muted, "alice", null));

        assertEquals(403, call("POST", "/channels/" + general + "/messages", "bob", "{\"content\":\"still here?\"}").status());

        var explain = ok(call("GET", "/spaces/" + spaceId + "/permissions/explain?permission=SEND_MESSAGES&channelId=" + general + "&userId=bob", "alice", null));
        assertFalse(explain.json().path("allowed").asBoolean());
        assertTrue(explain.text("text").contains("Space · Role Muted"));
        assertTrue(explain.text("text").contains("Final Result: DENY"));

        // Members can explain their own permissions but not other people's.
        assertEquals(200, call("GET", "/spaces/" + spaceId + "/permissions/explain?permission=SEND_MESSAGES&channelId=" + general, "carol", null).status());
        assertEquals(403, call("GET", "/spaces/" + spaceId + "/permissions/explain?permission=SEND_MESSAGES&userId=bob", "carol", null).status());
    }

    @Test
    void roleHierarchyAndPowerGuardModeration() throws Exception {
        var spaceId = ok(call("POST", "/spaces", "alice", "{\"name\":\"Hierarchy\"}")).text("id");
        var invite = ok(call("POST", "/spaces/" + spaceId + "/invites", "alice", "{}")).text("code");

        for (var user : new String[] {"mod", "bob", "eve"}) {
            ok(call("POST", "/invites/" + invite + "/join", user, null));
        }

        var roles = ok(call("GET", "/spaces/" + spaceId + "/roles", "alice", null)).json();
        var moderator = roles.get(1);
        var member = roles.get(2);

        assertEquals("Moderator", moderator.path("name").asString());
        assertEquals(16384, moderator.path("powers").path("KICK").path("value").asInt());
        assertEquals(0, member.path("powers").path("KICK").path("value").asInt());
        assertEquals(1, member.path("requiredPowers").path("KICK").path("value").asInt());

        ok(call("PUT", "/spaces/" + spaceId + "/members/mod/roles/" + moderator.path("id").asString(), "alice", null));

        // A plain member lacks the permission, a moderator lacks the power over the owner.
        assertEquals(403, call("POST", "/spaces/" + spaceId + "/members/eve/kick", "bob", null).status());
        assertEquals(403, call("POST", "/spaces/" + spaceId + "/members/alice/kick", "mod", null).status());
        assertEquals(403, call("PUT", "/spaces/" + spaceId + "/members/mod/roles/" + moderator.path("id").asString(), "mod", null).status());

        var power = ok(call("GET", "/spaces/" + spaceId + "/power/explain?type=KICK&targetId=eve", "mod", null));
        assertTrue(power.json().path("allowed").asBoolean());
        assertEquals(1, power.json().path("required").asInt());

        assertEquals(403, call("POST", "/spaces/" + spaceId + "/members/eve/ban", "mod", "{\"reason\":\"spam\"}").status());
        assertEquals(204, call("POST", "/spaces/" + spaceId + "/members/eve/kick", "mod", null).status());

        // The kicked member can come back, a banned one cannot.
        ok(call("POST", "/invites/" + invite + "/join", "eve", null));
        assertEquals(204, call("POST", "/spaces/" + spaceId + "/members/eve/ban", "alice", "{\"reason\":\"spam\"}").status());
        assertEquals(403, call("POST", "/invites/" + invite + "/join", "eve", null).status());

        var audit = ok(call("GET", "/spaces/" + spaceId + "/audit", "mod", null));
        assertTrue(audit.body().contains("member.ban") && audit.body().contains("member.kick"));
        assertEquals(403, call("GET", "/spaces/" + spaceId + "/audit", "bob", null).status());
    }

    @Test
    void privateChannelsOnlyRelayCiphertextAndHideOlderHistory() throws Exception {
        var spaceId = ok(call("POST", "/spaces", "alice", "{\"name\":\"Private\"}")).text("id");
        var channel = ok(call("POST", "/spaces/" + spaceId + "/channels", "alice", "{\"name\":\"secret\",\"mode\":\"PRIVATE\"}")).text("id");

        assertEquals(400, call("POST", "/channels/" + channel + "/messages", "alice", "{\"content\":\"plaintext\"}").status());
        ok(call("POST", "/channels/" + channel + "/messages", "alice", "{\"ciphertext\":\"AAECAwQF\"}"));

        var invite = ok(call("POST", "/spaces/" + spaceId + "/invites", "alice", "{}")).text("code");
        Thread.sleep(5);
        ok(call("POST", "/invites/" + invite + "/join", "bob", null));

        assertEquals(0, ok(call("GET", "/channels/" + channel + "/messages", "bob", null)).json().path("messages").size());
        assertEquals(1, ok(call("GET", "/channels/" + channel + "/messages", "alice", null)).json().path("messages").size());

        // Public channels cannot carry ciphertext.
        var general = ok(call("GET", "/spaces/" + spaceId + "/channels", "alice", null)).json().get(0).path("id").asString();
        assertEquals(400, call("POST", "/channels/" + general + "/messages", "alice", "{\"ciphertext\":\"AAEC\"}").status());
    }

    @Test
    void channelJoinPowerHidesChannelFromWeakerMembers() throws Exception {
        var spaceId = ok(call("POST", "/spaces", "alice", "{\"name\":\"Power\"}")).text("id");
        var general = ok(call("GET", "/spaces/" + spaceId + "/channels", "alice", null)).json().get(0).path("id").asString();
        var invite = ok(call("POST", "/spaces/" + spaceId + "/invites", "alice", "{}")).text("code");

        ok(call("POST", "/invites/" + invite + "/join", "bob", null));
        ok(call("PUT", "/spaces/" + spaceId + "/channels/" + general + "/required-join-power", "alice", "{\"value\":800}"));

        assertEquals(404, call("GET", "/channels/" + general + "/messages", "bob", null).status());
        assertEquals(0, ok(call("GET", "/spaces/" + spaceId + "/channels", "bob", null)).json().size());
        assertEquals(200, call("GET", "/channels/" + general + "/messages", "alice", null).status());

        var explain = ok(call("GET", "/spaces/" + spaceId + "/power/explain?type=JOIN&channelId=" + general, "bob", null));
        assertFalse(explain.json().path("allowed").asBoolean());
        assertEquals(800, explain.json().path("required").asInt());
    }

    @Test
    void editsReactionsAndEvents() throws Exception {
        var spaceId = ok(call("POST", "/spaces", "alice", "{\"name\":\"Events\"}")).text("id");
        var general = ok(call("GET", "/spaces/" + spaceId + "/channels", "alice", null)).json().get(0).path("id").asString();
        var invite = ok(call("POST", "/spaces/" + spaceId + "/invites", "alice", "{}")).text("code");

        ok(call("POST", "/invites/" + invite + "/join", "bob", null));

        var message = ok(call("POST", "/channels/" + general + "/messages", "alice", "{\"content\":\"v1\"}")).text("id");
        var path = "/channels/" + general + "/messages/" + message;

        assertEquals(403, call("PATCH", path, "bob", "{\"content\":\"hijack\"}").status());
        assertTrue(ok(call("PATCH", path, "alice", "{\"content\":\"v2\"}")).body().contains("\"content\":\"v2\""));

        var thumbsUp = "%F0%9F%91%8D";
        assertTrue(ok(call("PUT", path + "/reactions/" + thumbsUp, "bob", null)).body().contains("\"userIds\":[\"bob\"]"));
        assertEquals(0, ok(call("DELETE", path + "/reactions/" + thumbsUp, "bob", null)).json().path("reactions").size());

        var types = ok(call("GET", "/spaces/" + spaceId + "/events?after=0", "alice", null)).body();
        assertTrue(types.contains("member.join") && types.contains("message.create") && types.contains("message.edit")
                && types.contains("reaction.add") && types.contains("reaction.remove"));

        assertEquals(400, call("POST", "/channels/" + general + "/messages", "alice", "{\"content\":\" \"}").status());
        assertEquals(400, call("POST", "/channels/" + general + "/messages", "alice", "{\"content\":\"" + "x".repeat(4001) + "\"}").status());
    }

    @Test
    void nonMembersDoNotLearnThatASpaceExists() throws Exception {
        var spaceId = ok(call("POST", "/spaces", "alice", "{\"name\":\"Hidden\"}")).text("id");

        assertEquals(404, call("GET", "/spaces/" + spaceId, "mallory", null).status());
        assertEquals(404, call("GET", "/spaces/" + spaceId + "/channels", "mallory", null).status());
    }

    private Reply ok(Reply reply) {
        assertTrue(reply.status() >= 200 && reply.status() < 300, "Unexpected " + reply.status() + ": " + reply.body());
        return reply;
    }

    private Reply call(String method, String path, String user, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(baseUrl + path));

        if (user != null) {
            request.header("Authorization", user.startsWith("Bearer ") ? user : "Bearer dev:" + user);
        }

        if (body != null) {
            request.header("Content-Type", "application/json");
        }

        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));

        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        return new Reply(response.statusCode(), response.body());
    }

    private static int freePort() throws IOException {
        try (var socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }
}
