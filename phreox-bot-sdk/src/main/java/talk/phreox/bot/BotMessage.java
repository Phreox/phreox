package talk.phreox.bot;

/**
 * A message in a channel of a space the bot is a member of.
 *
 * @param seq the number of the message in its channel, growing with every message
 */
public record BotMessage(String spaceId, String channelId, String id, long seq, String senderId, String content, long createdAt, Replier replier) {

    /** How an answer is sent; the bot gives its own. */
    @FunctionalInterface
    public interface Replier {

        void send(String spaceId, String channelId, String text);
    }

    /** Writes into the channel this message is from. */
    public void reply(String text) {
        replier.send(spaceId, channelId, text);
    }
}
