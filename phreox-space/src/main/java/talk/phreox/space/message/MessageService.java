package talk.phreox.space.message;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.api.pxp.ConversationMode;
import talk.phreox.space.event.SpaceEvents;
import talk.phreox.space.guild.Channel;
import talk.phreox.space.guild.SpaceAccess;
import talk.phreox.space.permission.Permission;

public final class MessageService {

    private static final int MAX_CONTENT_LENGTH = 4000;
    private static final int MAX_CIPHERTEXT_LENGTH = 100_000;
    private static final int MAX_EMOJI_LENGTH = 32;
    private static final int MAX_REACTIONS = 20;

    private final SpaceAccess access;
    private final MessageStore store;
    private final SpaceEvents events;

    public MessageService(SpaceAccess access, MessageStore store, SpaceEvents events) {
        this.access = access;
        this.store = store;
        this.events = events;
    }

    public SpaceApi.MessagePage load(String userId, String channelId, String before, int limit) {
        var context = access.channel(channelId, userId);
        var channel = context.channel();

        // Private channels give new members no history from before they joined.
        var since = channel.mode() == ConversationMode.PRIVATE ? access.member(context.space(), userId).joinedAt() : 0;

        return store.page(channelId, before, limit, since);
    }

    public SpaceApi.MessageView send(String userId, String channelId, SpaceApi.SendMessageRequest request) {
        var context = access.channel(channelId, userId);
        var space = context.space();
        var channel = context.channel();

        access.require(space, userId, Permission.SEND_MESSAGES, channel);

        if (access.member(space, userId).muted(System.currentTimeMillis())) {
            throw ApiException.forbidden("You are muted");
        }

        if (request == null) {
            throw ApiException.badRequest("Missing request body");
        }

        var payload = payload(channel, request.content(), request.ciphertext());
        var view = store.add(channelId, userId, payload.content(), payload.ciphertext()).view();

        events.publish(space.id(), "message.create", channelId, view);
        return view;
    }

    public SpaceApi.MessageView edit(String userId, String channelId, String messageId, SpaceApi.EditMessageRequest request) {
        var context = access.channel(channelId, userId);
        var message = message(channelId, messageId);

        if (!message.authorId().equals(userId)) {
            throw ApiException.forbidden("Only the author can edit a message");
        }

        if (request == null) {
            throw ApiException.badRequest("Missing request body");
        }

        var payload = payload(context.channel(), request.content(), request.ciphertext());
        message.edit(payload.content(), payload.ciphertext());

        var view = message.view();
        events.publish(context.space().id(), "message.edit", channelId, view);
        return view;
    }

    public void delete(String userId, String channelId, String messageId) {
        var context = access.channel(channelId, userId);
        var message = message(channelId, messageId);

        if (!message.authorId().equals(userId)) {
            access.require(context.space(), userId, Permission.MANAGE_MESSAGES, context.channel());
            context.space().audit("message.delete", userId, message.authorId(), messageId);
        }

        store.remove(channelId, messageId);
        events.publish(context.space().id(), "message.delete", channelId, messageId);
    }

    public SpaceApi.MessageView react(String userId, String channelId, String messageId, String emoji) {
        var context = access.channel(channelId, userId);
        var message = message(channelId, messageId);

        access.require(context.space(), userId, Permission.ADD_REACTIONS, context.channel());

        if (message.react(emoji(emoji), userId, MAX_REACTIONS)) {
            events.publish(context.space().id(), "reaction.add", channelId, new Reaction(messageId, emoji, userId));
        }

        return message.view();
    }

    public SpaceApi.MessageView unreact(String userId, String channelId, String messageId, String emoji) {
        var context = access.channel(channelId, userId);
        var message = message(channelId, messageId);

        if (message.unreact(emoji(emoji), userId)) {
            events.publish(context.space().id(), "reaction.remove", channelId, new Reaction(messageId, emoji, userId));
        }

        return message.view();
    }

    public record Reaction(String messageId, String emoji, String userId) {
    }

    private record Payload(String content, String ciphertext) {
    }

    private Message message(String channelId, String messageId) {
        return store.find(channelId, messageId).orElseThrow(() -> ApiException.notFound("Message not found"));
    }

    /** PUBLIC channels are server-readable text, PRIVATE channels only relay an opaque ciphertext. */
    private Payload payload(Channel channel, String content, String ciphertext) {
        if (channel.mode() == ConversationMode.PRIVATE) {
            if (content != null) {
                throw ApiException.badRequest("Private channels only accept ciphertext");
            }

            if (ciphertext == null || ciphertext.isBlank()) {
                throw ApiException.badRequest("Ciphertext is empty");
            }

            if (ciphertext.length() > MAX_CIPHERTEXT_LENGTH) {
                throw ApiException.badRequest("Ciphertext exceeds " + MAX_CIPHERTEXT_LENGTH + " characters");
            }

            return new Payload(null, ciphertext);
        }

        if (ciphertext != null) {
            throw ApiException.badRequest("Public channels do not accept ciphertext");
        }

        if (content == null || content.isBlank()) {
            throw ApiException.badRequest("Message content is empty");
        }

        if (content.length() > MAX_CONTENT_LENGTH) {
            throw ApiException.badRequest("Message content exceeds " + MAX_CONTENT_LENGTH + " characters");
        }

        return new Payload(content, null);
    }

    private String emoji(String emoji) {
        if (emoji == null || emoji.isBlank() || emoji.length() > MAX_EMOJI_LENGTH) {
            throw ApiException.badRequest("Invalid emoji");
        }

        return emoji;
    }
}
