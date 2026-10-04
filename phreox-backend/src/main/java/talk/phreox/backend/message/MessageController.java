package talk.phreox.backend.message;

import talk.phreox.api.http.*;

@Path("/channels")
public final class MessageController {

    private final MessageEngine messages;

    public MessageController(MessageEngine messages) {
        this.messages = messages;
    }

    @GET
    @Path("/{channelId}/messages")
    public MessagePage messages(@PathParam("channelId") String channelId, @QueryParam("before") String before, @QueryParam("limit") int limit) {
        return messages.load(channelId, before, limit);
    }

    @POST
    @Path("/{channelId}/messages")
    public MessageView send(@PathParam("channelId") String channelId, @Body SendMessageRequest request) {
        return messages.send(channelId, request);
    }
}
