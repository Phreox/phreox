package talk.phreox.space.message;

import talk.phreox.api.SpaceApi;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public final class InMemoryMessageStore implements MessageStore {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;

    private final Map<String, List<Message>> channels = new ConcurrentHashMap<>();

    @Override
    public Message add(String channelId, String authorId, String content, String ciphertext) {
        var message = new Message(UUID.randomUUID().toString(), channelId, authorId, content, ciphertext, System.currentTimeMillis());
        var messages = channels.computeIfAbsent(channelId, id -> new ArrayList<>());

        synchronized (messages) {
            messages.add(message);
        }

        return message;
    }

    @Override
    public Optional<Message> find(String channelId, String messageId) {
        var messages = channels.get(channelId);

        if (messages == null) {
            return Optional.empty();
        }

        synchronized (messages) {
            return messages.stream().filter(message -> message.id().equals(messageId)).findFirst();
        }
    }

    @Override
    public boolean remove(String channelId, String messageId) {
        var messages = channels.get(channelId);

        if (messages == null) {
            return false;
        }

        synchronized (messages) {
            return messages.removeIf(message -> message.id().equals(messageId));
        }
    }

    @Override
    public SpaceApi.MessagePage page(String channelId, String before, int limit, long since) {
        var all = channels.get(channelId);

        if (all == null) {
            return new SpaceApi.MessagePage(List.of(), false);
        }

        List<Message> messages;

        synchronized (all) {
            messages = all.stream().filter(message -> message.createdAt() >= since).toList();
        }

        var end = end(messages, before);
        var start = Math.max(0, end - pageSize(limit));

        return new SpaceApi.MessagePage(messages.subList(start, end).stream().map(Message::view).toList(), start > 0);
    }

    private static int end(List<Message> messages, String before) {
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

    private static int pageSize(int limit) {
        return limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
    }
}
