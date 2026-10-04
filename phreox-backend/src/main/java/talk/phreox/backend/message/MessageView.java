package talk.phreox.backend.message;

public record MessageView(String id, String channelId, String content, long createdAt) {
}
