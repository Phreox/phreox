package talk.phreox.backend.message;

import java.util.List;

public record MessagePage(List<MessageView> messages, boolean hasMore) {
}
