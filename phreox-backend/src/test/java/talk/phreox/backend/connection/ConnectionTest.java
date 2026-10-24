package talk.phreox.backend.connection;

import io.javalin.Javalin;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import talk.phreox.api.ApiRoutes;
import talk.phreox.backend.event.EventBus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ConnectionTest {

    private Javalin node;
    private String url;
    private String authority;

    @BeforeEach
    void startNode() {
        authority = "space";
        node = Javalin.create(config -> config.routes.get(ApiRoutes.CAPABILITIES, context -> {
            context.contentType("application/json").result("{\"protocol\":1,\"authority\":\"" + authority + "\",\"capabilities\":[\"messaging\",\"guild\"]}");
        })).start(0);
        url = "http://127.0.0.1:" + node.port();
    }

    @AfterEach
    void stopNode() {
        node.stop();
    }

    @Test
    void addsSpaceAndReadsCapabilities() {
        var manager = new SpaceConnectionManager(new NodeProbe(), new EventBus());

        var connection = manager.add(url + "/");

        assertEquals(NodeStatus.CONNECTED, connection.node().status());
        assertEquals(java.util.List.of("messaging", "guild"), connection.node().capabilities());
        assertEquals(connection.id(), manager.add(url).id());
        assertEquals(1, manager.list().size());
    }

    @Test
    void refusesNodeWithWrongAuthority() {
        authority = "service";
        var manager = new SpaceConnectionManager(new NodeProbe(), new EventBus());

        assertThrows(IllegalArgumentException.class, () -> manager.add(url));
        assertEquals(0, manager.list().size());
    }

    @Test
    void marksSpaceUnreachableAfterNodeStops() {
        var manager = new SpaceConnectionManager(new NodeProbe(), new EventBus());
        var connection = manager.add(url);

        node.stop();

        assertEquals(NodeStatus.UNREACHABLE, manager.refresh(connection.id()).node().status());
        assertNull(manager.refresh("missing"));
    }

    @Test
    void removesSpace() {
        var manager = new SpaceConnectionManager(new NodeProbe(), new EventBus());
        var connection = manager.add(url);

        assertNotNull(manager.get(connection.id()));
        assertEquals(true, manager.remove(connection.id()));
        assertEquals(false, manager.remove(connection.id()));
    }

    @Test
    void requiresTlsForRemoteNodes() {
        assertThrows(IllegalArgumentException.class, () -> NodeProbe.validate("http://example.com"));
        assertThrows(IllegalArgumentException.class, () -> NodeProbe.validate("https://user:pw@example.com"));
        assertThrows(IllegalArgumentException.class, () -> NodeProbe.validate("ftp://example.com"));
        assertEquals("https://example.com:8443", NodeProbe.validate("https://example.com:8443/some/path").toString());
    }
}
