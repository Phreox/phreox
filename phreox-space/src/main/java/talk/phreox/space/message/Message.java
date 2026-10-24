package talk.phreox.space.message;

import talk.phreox.api.SpaceApi;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Message {

    private final String id;
    private final String channelId;
    private final String authorId;
    private final long createdAt;
    private final Map<String, Set<String>> reactions = new LinkedHashMap<>();

    private String content;
    private String ciphertext;
    private long editedAt;

    Message(String id, String channelId, String authorId, String content, String ciphertext, long createdAt) {
        this.id = id;
        this.channelId = channelId;
        this.authorId = authorId;
        this.content = content;
        this.ciphertext = ciphertext;
        this.createdAt = createdAt;
    }

    public String id() {
        return id;
    }

    public String authorId() {
        return authorId;
    }

    public long createdAt() {
        return createdAt;
    }

    public synchronized void edit(String content, String ciphertext) {
        this.content = content;
        this.ciphertext = ciphertext;
        this.editedAt = System.currentTimeMillis();
    }

    public synchronized boolean react(String emoji, String userId, int maxEmojis) {
        if (!reactions.containsKey(emoji) && reactions.size() >= maxEmojis) {
            throw new IllegalArgumentException("Message already has " + maxEmojis + " different reactions");
        }

        return reactions.computeIfAbsent(emoji, key -> new LinkedHashSet<>()).add(userId);
    }

    public synchronized boolean unreact(String emoji, String userId) {
        var users = reactions.get(emoji);

        if (users == null || !users.remove(userId)) {
            return false;
        }

        if (users.isEmpty()) {
            reactions.remove(emoji);
        }

        return true;
    }

    public synchronized SpaceApi.MessageView view() {
        var views = reactions.entrySet().stream().map(entry -> new SpaceApi.ReactionView(entry.getKey(), List.copyOf(entry.getValue()))).toList();

        return new SpaceApi.MessageView(id, channelId, authorId, content, ciphertext, createdAt, editedAt, views);
    }
}
