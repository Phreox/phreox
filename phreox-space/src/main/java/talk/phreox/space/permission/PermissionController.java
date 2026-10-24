package talk.phreox.space.permission;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.PUT;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;
import talk.phreox.space.auth.Authenticator;

@Path("/spaces")
public final class PermissionController {

    private final Authenticator authenticator;
    private final PermissionService permissions;

    public PermissionController(Authenticator authenticator, PermissionService permissions) {
        this.authenticator = authenticator;
        this.permissions = permissions;
    }

    @PUT
    @Path("/{spaceId}/overrides")
    public void setOverride(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @Body SpaceApi.SetOverrideRequest request) {
        permissions.setOverride(authenticator.user(authorization), spaceId, request);
    }

    @GET
    @Path("/{spaceId}/permissions/explain")
    public SpaceApi.PermissionExplainResponse explainPermission(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @QueryParam("permission") String permission, @QueryParam("channelId") String channelId, @QueryParam("userId") String userId) {
        return permissions.explainPermission(authenticator.user(authorization), spaceId, permission, channelId, userId);
    }

    @GET
    @Path("/{spaceId}/power/explain")
    public SpaceApi.PowerExplainResponse explainPower(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @QueryParam("type") String type, @QueryParam("channelId") String channelId, @QueryParam("targetId") String targetId, @QueryParam("userId") String userId) {
        return permissions.explainPower(authenticator.user(authorization), spaceId, type, channelId, targetId, userId);
    }
}
