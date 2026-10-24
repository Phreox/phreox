package talk.phreox.space.message;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.PATCH;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.PUT;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.DefaultValue;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;
import talk.phreox.space.auth.Authenticator;

@Path("/channels")
public final class MessageController {

    private final Authenticator authenticator;
    private final MessageService messages;

    public MessageController(Authenticator authenticator, MessageService messages) {
        this.authenticator = authenticator;
        this.messages = messages;
    }

    @GET
    @Path("/{channelId}/messages")
    public SpaceApi.MessagePage messages(@Header("Authorization") String authorization, @PathParam("channelId") String channelId,
            @QueryParam("before") String before, @QueryParam("limit") @DefaultValue("50") int limit) {
        return messages.load(authenticator.user(authorization), channelId, before, limit);
    }

    @POST
    @Path("/{channelId}/messages")
    public SpaceApi.MessageView send(@Header("Authorization") String authorization, @PathParam("channelId") String channelId,
            @Body SpaceApi.SendMessageRequest request) {
        return messages.send(authenticator.user(authorization), channelId, request);
    }

    @PATCH
    @Path("/{channelId}/messages/{messageId}")
    public SpaceApi.MessageView edit(@Header("Authorization") String authorization, @PathParam("channelId") String channelId,
            @PathParam("messageId") String messageId, @Body SpaceApi.EditMessageRequest request) {
        return messages.edit(authenticator.user(authorization), channelId, messageId, request);
    }

    @DELETE
    @Path("/{channelId}/messages/{messageId}")
    public void delete(@Header("Authorization") String authorization, @PathParam("channelId") String channelId, @PathParam("messageId") String messageId) {
        messages.delete(authenticator.user(authorization), channelId, messageId);
    }

    @PUT
    @Path("/{channelId}/messages/{messageId}/reactions/{emoji}")
    public SpaceApi.MessageView react(@Header("Authorization") String authorization, @PathParam("channelId") String channelId,
            @PathParam("messageId") String messageId, @PathParam("emoji") String emoji) {
        return messages.react(authenticator.user(authorization), channelId, messageId, emoji);
    }

    @DELETE
    @Path("/{channelId}/messages/{messageId}/reactions/{emoji}")
    public SpaceApi.MessageView unreact(@Header("Authorization") String authorization, @PathParam("channelId") String channelId,
            @PathParam("messageId") String messageId, @PathParam("emoji") String emoji) {
        return messages.unreact(authenticator.user(authorization), channelId, messageId, emoji);
    }
}
