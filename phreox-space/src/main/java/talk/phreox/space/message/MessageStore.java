package talk.phreox.space.message;

import talk.phreox.api.SpaceApi;

import java.util.Optional;

public interface MessageStore {

    Message add(String channelId, String authorId, String content, String ciphertext);

    Optional<Message> find(String channelId, String messageId);

    boolean remove(String channelId, String messageId);

    /** Newest page before the given message; messages created before {@code since} are skipped. */
    SpaceApi.MessagePage page(String channelId, String before, int limit, long since);
}
