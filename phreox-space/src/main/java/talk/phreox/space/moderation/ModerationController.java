package talk.phreox.space.moderation;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.DefaultValue;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;
import talk.phreox.space.auth.Authenticator;

import java.util.List;

@Path("/spaces")
public final class ModerationController {

    private final Authenticator authenticator;
    private final ModerationService moderation;

    public ModerationController(Authenticator authenticator, ModerationService moderation) {
        this.authenticator = authenticator;
        this.moderation = moderation;
    }

    @POST
    @Path("/{spaceId}/members/{userId}/kick")
    public void kick(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("userId") String userId) {
        moderation.kick(authenticator.user(authorization), spaceId, userId);
    }

    @POST
    @Path("/{spaceId}/members/{userId}/ban")
    public void ban(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("userId") String userId,
            @Body SpaceApi.BanRequest request) {
        moderation.ban(authenticator.user(authorization), spaceId, userId, request);
    }

    @DELETE
    @Path("/{spaceId}/bans/{userId}")
    public void unban(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("userId") String userId) {
        moderation.unban(authenticator.user(authorization), spaceId, userId);
    }

    @POST
    @Path("/{spaceId}/members/{userId}/mute")
    public SpaceApi.MemberView mute(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("userId") String userId,
            @Body SpaceApi.MuteRequest request) {
        return moderation.mute(authenticator.user(authorization), spaceId, userId, request);
    }

    @GET
    @Path("/{spaceId}/audit")
    public List<SpaceApi.AuditEntryView> audit(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        return moderation.audit(authenticator.user(authorization), spaceId, limit);
    }
}
