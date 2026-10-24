package talk.phreox.backend.message;

import java.util.List;

public record MessageView(String id, String channelId, String content, long createdAt, Long editedAt, List<String> reactions) {
}
