package talk.phreox.backend.message;

import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.DefaultValue;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;

@Path("/channels")
public final class MessageController {

    private final MessageEngine messages;

    public MessageController(MessageEngine messages) {
        this.messages = messages;
    }

    @GET
    @Path("/{channelId}/messages")
    public MessagePage messages(@PathParam("channelId") String channelId, @QueryParam("before") String before, @QueryParam("limit") @DefaultValue("50") int limit) {
        return messages.load(channelId, before, limit);
    }

    @POST
    @Path("/{channelId}/messages")
    public MessageView send(@PathParam("channelId") String channelId, @Body SendMessageRequest request) {
        return messages.send(channelId, request);
    }
}
