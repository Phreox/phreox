package talk.phreox.backend.message;

import org.junit.jupiter.api.Test;
import talk.phreox.api.http.ApiException;
import talk.phreox.backend.event.EventBus;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MessageEngineTest {

    private final EventBus events = new EventBus();
    private final MessageEngine engine = new MessageEngine(events);

    @Test
    void pagesBackwardsFromCursor() {
        var ids = new ArrayList<String>();

        for (var i = 0; i < 5; i++) {
            ids.add(engine.send("c", new SendMessageRequest("m" + i)).id());
        }

        var latest = engine.load("c", null, 2);
        var older = engine.load("c", latest.messages().getFirst().id(), 2);

        assertEquals(ids.subList(3, 5), latest.messages().stream().map(MessageView::id).toList());
        assertTrue(latest.hasMore());
        assertEquals(ids.subList(1, 3), older.messages().stream().map(MessageView::id).toList());
        assertTrue(older.hasMore());
    }

    @Test
    void rejectsUnknownCursor() {
        engine.send("c", new SendMessageRequest("x"));

        assertThrows(ApiException.class, () -> engine.load("c", "missing", 10));
    }

    @Test
    void editsMessageAndKeepsOrder() {
        var first = engine.send("c", new SendMessageRequest("a"));
        engine.send("c", new SendMessageRequest("b"));

        var edited = engine.edit("c", first.id(), "a2");

        assertEquals("a2", edited.content());
        assertNotNull(edited.editedAt());
        assertNull(first.editedAt());
        assertEquals("a2", engine.load("c", null, 10).messages().getFirst().content());
    }

    @Test
    void deletesMessageAndPublishesEvent() {
        var types = new ArrayList<String>();
        events.subscribe(event -> types.add(event.type()));

        var message = engine.send("c", new SendMessageRequest("a"));
        engine.delete("c", message.id());

        assertTrue(engine.load("c", null, 10).messages().isEmpty());
        assertEquals(java.util.List.of("message.created", "message.deleted"), types);
        assertThrows(ApiException.class, () -> engine.delete("c", message.id()));
    }

    @Test
    void togglesReactionsIdempotently() {
        var message = engine.send("c", new SendMessageRequest("a"));

        engine.react("c", message.id(), "👍", true);
        var again = engine.react("c", message.id(), "👍", true);
        var removed = engine.react("c", message.id(), "👍", false);

        assertEquals(java.util.List.of("👍"), again.reactions());
        assertTrue(removed.reactions().isEmpty());
    }

    @Test
    void rejectsInvalidInput() {
        var message = engine.send("c", new SendMessageRequest("a"));

        assertThrows(IllegalArgumentException.class, () -> engine.send("c", new SendMessageRequest("  ")));
        assertThrows(IllegalArgumentException.class, () -> engine.send("c", new SendMessageRequest("x".repeat(4001))));
        assertThrows(IllegalArgumentException.class, () -> engine.edit("c", message.id(), null));
        assertThrows(IllegalArgumentException.class, () -> engine.react("c", message.id(), "", true));
    }
}
