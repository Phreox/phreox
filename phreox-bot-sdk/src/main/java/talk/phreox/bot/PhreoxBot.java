package talk.phreox.bot;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * A bot for Phreox. It uses the token of a bot (made in the settings of the app, under Bots) and is a member of spaces like anybody: the
 * owner of a space adds it. It reads the events of the service, loads the new messages of the channel an event names and hands them to
 * {@link Builder#onMessage}. It never answers its own messages.
 *
 * <pre>{@code
 * var bot = PhreoxBot.builder().token(System.getenv("PHREOX_BOT_TOKEN")).onMessage(message -> {
 *     if (message.content().equals("!ping")) message.reply("pong");
 * }).build();
 *
 * bot.start();
 * }</pre>
 */
public final class PhreoxBot implements AutoCloseable {

    public static final String DEFAULT_SERVICE = "https://service.phreox.talk";

    private static final String PREFIX = "/api/v1";
    private static final int PAGE = 30;
    private static final Duration RECONNECT_MAX = Duration.ofSeconds(30);

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final URI service;
    private final String token;
    private final Consumer<BotMessage> handler;
    private final Consumer<Exception> errors;
    private final Map<String, Long> lastSeq = new ConcurrentHashMap<>();
    private final long startedAt = System.currentTimeMillis();
    private volatile String selfId = "";
    private volatile boolean running;
    private volatile Thread thread;

    private PhreoxBot(URI service, String token, Consumer<BotMessage> handler, Consumer<Exception> errors) {
        this.service = service;
        this.token = token;
        this.handler = handler;
        this.errors = errors;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {

        private String service = DEFAULT_SERVICE;
        private String token;
        private Consumer<BotMessage> handler = message -> {
        };
        private Consumer<Exception> errors = exception -> System.err.println("phreox-bot: " + exception.getMessage());

        /** The address of the Phreox service; {@value DEFAULT_SERVICE} by default. */
        public Builder service(String service) {
            this.service = service;
            return this;
        }

        /** The token of the bot. */
        public Builder token(String token) {
            this.token = token;
            return this;
        }

        /** Called for every new message of somebody else. It runs on the thread of the bot: a long job belongs on another thread. */
        public Builder onMessage(Consumer<BotMessage> handler) {
            this.handler = handler;
            return this;
        }

        /** Called for a problem (the connection was lost and is made again, a message could not be read). */
        public Builder onError(Consumer<Exception> errors) {
            this.errors = errors;
            return this;
        }

        public PhreoxBot build() {
            if (token == null || token.isBlank()) {
                throw new IllegalArgumentException("A bot needs its token");
            }

            return new PhreoxBot(URI.create(service.replaceAll("/+$", "")), token.strip(), handler, errors);
        }
    }

    /** Starts listening on a thread of its own. */
    public synchronized PhreoxBot start() {
        if (running) {
            return this;
        }

        running = true;
        thread = Thread.ofPlatform().name("phreox-bot").daemon(false).start(this::loop);

        return this;
    }

    /** Waits until the bot is stopped, so a program that only runs the bot does not end. */
    public void join() throws InterruptedException {
        var current = thread;

        if (current != null) {
            current.join();
        }
    }

    @Override
    public void close() {
        running = false;

        var current = thread;

        if (current != null) {
            current.interrupt();
        }
    }

    /** Writes a message into a channel of a space. */
    public void send(String spaceId, String channelId, String text) {
        var body = mapper.createObjectNode().put("content", text).toString();
        var response = call("POST", "/spaces/" + encode(spaceId) + "/channels/" + encode(channelId) + "/messages", body);

        if (response.statusCode() >= 300) {
            throw new IllegalStateException("The message was not sent: HTTP " + response.statusCode() + " " + response.body());
        }
    }

    // ---- the connection ----------------------------------------------------------------------------------------------

    private void loop() {
        var pause = Duration.ofSeconds(1);

        while (running) {
            try {
                selfId = mapper.readTree(call("GET", "/admin/me", null).body()).path("id").asString("");
                listen();
                pause = Duration.ofSeconds(1);
            } catch (InterruptedException exception) {
                return;
            } catch (IOException | RuntimeException exception) {
                errors.accept(exception);
            }

            if (!running) {
                return;
            }

            try {
                Thread.sleep(pause);
            } catch (InterruptedException exception) {
                return;
            }

            pause = pause.multipliedBy(2).compareTo(RECONNECT_MAX) > 0 ? RECONNECT_MAX : pause.multipliedBy(2);
        }
    }

    private void listen() throws IOException, InterruptedException {
        var request = HttpRequest.newBuilder(service.resolve(PREFIX + "/events")).header("Authorization", "Bearer " + token).header("Accept", "text/event-stream").GET().build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() != 200) {
            throw new IOException("The service answered HTTP " + response.statusCode() + " to the event stream");
        }

        var lines = new EventLines(this::event);

        try (var reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;

            while (running && (line = reader.readLine()) != null) {
                lines.line(line);
            }
        }
    }

    private void event(String name, String data) {
        if (!name.equals("space.message")) {
            return;
        }

        try {
            var node = mapper.readTree(data);

            load(node.path("spaceId").asString(""), node.path("channelId").asString(""));
        } catch (RuntimeException exception) {
            errors.accept(exception);
        }
    }

    private void load(String spaceId, String channelId) {
        if (spaceId.isEmpty() || channelId.isEmpty()) {
            return;
        }

        var response = call("GET", "/spaces/" + encode(spaceId) + "/channels/" + encode(channelId) + "/messages?limit=" + PAGE, null);

        if (response.statusCode() != 200) {
            return;
        }

        var key = spaceId + "/" + channelId;

        for (JsonNode message : mapper.readTree(response.body()).path("messages")) {
            var seq = message.path("seq").asLong();

            if (seq <= lastSeq.getOrDefault(key, 0L)) {
                continue;
            }

            lastSeq.merge(key, seq, Math::max);

            var sender = message.path("senderId").asString("");

            // Only what is new since the bot started, and never its own words or the lines the space writes itself.
            if (sender.equals(selfId) || message.path("createdAt").asLong() < startedAt || !message.path("system").asString("").isEmpty()) {
                continue;
            }

            handler.accept(new BotMessage(spaceId, channelId, message.path("id").asString(""), seq, sender, message.path("content").asString(""), message.path("createdAt").asLong(), this::send));
        }
    }

    private HttpResponse<String> call(String method, String path, String body) {
        var builder = HttpRequest.newBuilder(service.resolve(PREFIX + path)).timeout(Duration.ofSeconds(20)).header("Authorization", "Bearer " + token).header("Accept", "application/json");
        var request = body == null
                ? builder.method(method, HttpRequest.BodyPublishers.noBody()).build()
                : builder.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body)).build();

        try {
            return client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException exception) {
            throw new IllegalStateException("The service cannot be reached: " + exception.getMessage(), exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted", exception);
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
