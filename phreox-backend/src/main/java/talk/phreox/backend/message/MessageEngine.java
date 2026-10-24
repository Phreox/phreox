package talk.phreox.backend.message;

import talk.phreox.api.http.ApiException;
import talk.phreox.backend.event.IEventBus;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Local message store until the PXP client delivers messages from the server. */
public final class MessageEngine {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;
    private static final int MAX_CONTENT_LENGTH = 4000;
    private static final int MAX_EMOJI_LENGTH = 32;
    private static final int MAX_REACTIONS = 20;

    private record Stored(String id, String channelId, String content, long createdAt, Long editedAt, TreeSet<String> reactions) {

        MessageView view() {
            return new MessageView(id, channelId, content, createdAt, editedAt, List.copyOf(reactions));
        }
    }

    private final Map<String, List<Stored>> channels = new ConcurrentHashMap<>();
    private final IEventBus events;

    public MessageEngine(IEventBus events) {
        this.events = events;
    }

    public MessagePage load(String channelId, String before, int limit) {
        var messages = channels.get(channelId);

        if (messages == null) {
            if (before != null) {
                throw ApiException.notFound("Message not found");
            }

            return new MessagePage(List.of(), false);
        }

        synchronized (messages) {
            var end = end(messages, before);
            var start = Math.max(0, end - pageSize(limit));

            return new MessagePage(messages.subList(start, end).stream().map(Stored::view).toList(), start > 0);
        }
    }

    public MessageView send(String channelId, SendMessageRequest request) {
        var content = content(request == null ? null : request.content());
        var message = new Stored(UUID.randomUUID().toString(), channelId, content, System.currentTimeMillis(), null, new TreeSet<>());
        var messages = channels.computeIfAbsent(channelId, id -> new ArrayList<>());

        synchronized (messages) {
            messages.add(message);
        }

        var view = message.view();
        events.publish("message.created", view);
        return view;
    }

    public MessageView edit(String channelId, String messageId, String newContent) {
        var content = content(newContent);
        var messages = channel(channelId);

        MessageView view;

        synchronized (messages) {
            var index = indexOf(messages, messageId);

            if (index < 0) {
                throw ApiException.notFound("Message not found");
            }

            var old = messages.get(index);
            var edited = new Stored(old.id(), old.channelId(), content, old.createdAt(), System.currentTimeMillis(), old.reactions());

            messages.set(index, edited);
            view = edited.view();
        }

        events.publish("message.edited", view);
        return view;
    }

    public void delete(String channelId, String messageId) {
        var messages = channel(channelId);

        synchronized (messages) {
            var index = indexOf(messages, messageId);

            if (index < 0) {
                throw ApiException.notFound("Message not found");
            }

            messages.remove(index);
        }

        events.publish("message.deleted", Map.of("id", messageId, "channelId", channelId));
    }

    public MessageView react(String channelId, String messageId, String emoji, boolean add) {
        if (emoji == null || emoji.isBlank() || emoji.length() > MAX_EMOJI_LENGTH) {
            throw new IllegalArgumentException("Invalid emoji");
        }

        var messages = channel(channelId);

        MessageView view;

        synchronized (messages) {
            var index = indexOf(messages, messageId);

            if (index < 0) {
                throw ApiException.notFound("Message not found");
            }

            var message = messages.get(index);

            if (add && !message.reactions().contains(emoji) && message.reactions().size() >= MAX_REACTIONS) {
                throw new IllegalArgumentException("Too many reactions");
            }

            var changed = add ? message.reactions().add(emoji) : message.reactions().remove(emoji);
            view = message.view();

            if (!changed) {
                return view;
            }
        }

        events.publish(add ? "reaction.added" : "reaction.removed", Map.of("messageId", messageId, "channelId", channelId, "emoji", emoji));
        return view;
    }

    private List<Stored> channel(String channelId) {
        var messages = channels.get(channelId);

        if (messages == null) {
            throw ApiException.notFound("Message not found");
        }

        return messages;
    }

    private String content(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content is empty");
        }

        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("Message content exceeds " + MAX_CONTENT_LENGTH + " characters");
        }

        return content;
    }

    private int end(List<Stored> messages, String before) {
        if (before == null) {
            return messages.size();
        }

        var index = indexOf(messages, before);

        if (index < 0) {
            throw ApiException.notFound("Message not found");
        }

        return index;
    }

    private int indexOf(List<Stored> messages, String id) {
        for (var i = 0; i < messages.size(); i++) {
            if (messages.get(i).id().equals(id)) {
                return i;
            }
        }

        return -1;
    }

    private int pageSize(int limit) {
        if (limit <= 0) {
            return DEFAULT_LIMIT;
        }

        return Math.min(limit, MAX_LIMIT);
    }
}
