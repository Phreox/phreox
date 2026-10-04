package talk.phreox.backend.message;

import talk.phreox.backend.event.IEventBus;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Local message store until the PXP client delivers messages from the server. */
public final class MessageEngine {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;
    private static final int MAX_CONTENT_LENGTH = 4000;

    private final Map<String, List<MessageView>> channels = new ConcurrentHashMap<>();
    private final IEventBus events;

    public MessageEngine(IEventBus events) {
        this.events = events;
    }

    public MessagePage load(String channelId, String before, int limit) {
        var messages = channels.get(channelId);

        if (messages == null) {
            return new MessagePage(List.of(), false);
        }

        synchronized (messages) {
            var end = end(messages, before);
            var start = Math.max(0, end - pageSize(limit));

            return new MessagePage(List.copyOf(messages.subList(start, end)), start > 0);
        }
    }

    public MessageView send(String channelId, SendMessageRequest request) {
        if (request == null || request.content() == null || request.content().isBlank()) {
            throw new IllegalArgumentException("Message content is empty");
        }

        if (request.content().length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("Message content exceeds " + MAX_CONTENT_LENGTH + " characters");
        }

        var message = new MessageView(UUID.randomUUID().toString(), channelId, request.content(), System.currentTimeMillis());
        var messages = channels.computeIfAbsent(channelId, id -> new ArrayList<>());

        synchronized (messages) {
            messages.add(message);
        }

        events.publish("message.created", message);
        return message;
    }

    private int end(List<MessageView> messages, String before) {
        if (before == null) {
            return messages.size();
        }

        for (var i = 0; i < messages.size(); i++) {
            if (messages.get(i).id().equals(before)) {
                return i;
            }
        }

        return 0;
    }

    private int pageSize(int limit) {
        if (limit <= 0) {
            return DEFAULT_LIMIT;
        }

        return Math.min(limit, MAX_LIMIT);
    }
}
