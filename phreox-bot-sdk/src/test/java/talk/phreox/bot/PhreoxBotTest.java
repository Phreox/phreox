package talk.phreox.bot;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhreoxBotTest {

    @Test
    void eventLinesGiveNameAndDataOfEveryEvent() {
        var seen = new ArrayList<String>();
        var lines = new EventLines((name, data) -> seen.add(name + "=" + data));

        for (var line : List.of(": keep-alive", "", "event: ready", "data: {}", "", "event: space.message", "data: {\"a\":", "data: 1}", "")) {
            lines.line(line);
        }

        assertEquals(List.of("ready={}", "space.message={\"a\":\n1}"), seen);
    }

    @Test
    void aBotNeedsAToken() {
        assertThrows(IllegalArgumentException.class, () -> PhreoxBot.builder().build());
    }

    @Test
    void aBotAnswersMessagesOfOthersAndNotItsOwn() throws Exception {
        var now = System.currentTimeMillis() + 5000;
        var sent = new ArrayList<String>();
        var answered = new CountDownLatch(1);
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);

        server.createContext("/api/v1/admin/me", exchange -> reply(exchange, 200, "{\"id\":\"bot-id\"}"));
        server.createContext("/api/v1/events", exchange -> {
            exchange.getResponseHeaders().add("Content-Type", "text/event-stream");
            exchange.sendResponseHeaders(200, 0);

            try (var out = exchange.getResponseBody()) {
                out.write("event: ready\ndata: {}\n\nevent: space.message\ndata: {\"spaceId\":\"s1\",\"channelId\":\"c1\"}\n\n".getBytes(StandardCharsets.UTF_8));
                out.flush();
                answered.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        });
        server.createContext("/api/v1/spaces/s1/channels/c1/messages", exchange -> {
            if (exchange.getRequestMethod().equals("POST")) {
                sent.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                reply(exchange, 200, "{}");
                answered.countDown();
                return;
            }

            reply(exchange, 200, "{\"messages\":["
                    + "{\"id\":\"m0\",\"seq\":1,\"senderId\":\"somebody\",\"content\":\"old\",\"createdAt\":1},"
                    + "{\"id\":\"m1\",\"seq\":2,\"senderId\":\"somebody\",\"content\":\"!ping\",\"createdAt\":" + now + "},"
                    + "{\"id\":\"m2\",\"seq\":3,\"senderId\":\"bot-id\",\"content\":\"pong\",\"createdAt\":" + now + "}],\"hasMore\":false}");
        });
        // The stream of the events stays open while the other requests are answered.
        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(4));
        server.start();

        var heard = new ArrayList<String>();

        try (var bot = PhreoxBot.builder().service("http://127.0.0.1:" + server.getAddress().getPort()).token("token").onMessage(message -> {
            heard.add(message.content());
            message.reply("pong");
        }).build()) {
            bot.start();

            assertTrue(answered.await(5, TimeUnit.SECONDS), "the bot answered");
            // Not the old message (before the start), not its own.
            assertEquals(List.of("!ping"), heard);
            assertEquals(List.of("{\"content\":\"pong\"}"), sent);
        } finally {
            server.stop(0);
        }
    }

    private static void reply(com.sun.net.httpserver.HttpExchange exchange, int status, String body) throws java.io.IOException {
        var bytes = body.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }
}
