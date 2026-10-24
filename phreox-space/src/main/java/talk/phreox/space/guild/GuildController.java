package talk.phreox.space.guild;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.PUT;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.space.auth.Authenticator;

import java.util.List;

@Path("/spaces")
public final class GuildController {

    private final Authenticator authenticator;
    private final GuildService guild;

    public GuildController(Authenticator authenticator, GuildService guild) {
        this.authenticator = authenticator;
        this.guild = guild;
    }

    @POST
    public SpaceApi.SpaceView create(@Header("Authorization") String authorization, @Body SpaceApi.CreateSpaceRequest request) {
        return guild.create(authenticator.user(authorization), request);
    }

    @GET
    public List<SpaceApi.SpaceView> list(@Header("Authorization") String authorization) {
        return guild.list(authenticator.user(authorization));
    }

    @GET
    @Path("/{spaceId}")
    public SpaceApi.SpaceView get(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId) {
        return guild.get(authenticator.user(authorization), spaceId);
    }

    @POST
    @Path("/{spaceId}/leave")
    public void leave(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId) {
        guild.leave(authenticator.user(authorization), spaceId);
    }

    @GET
    @Path("/{spaceId}/members")
    public List<SpaceApi.MemberView> members(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId) {
        return guild.members(authenticator.user(authorization), spaceId);
    }

    @PUT
    @Path("/{spaceId}/members/{userId}/roles/{roleId}")
    public SpaceApi.MemberView assignRole(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("userId") String userId,
            @PathParam("roleId") String roleId) {
        return guild.assignRole(authenticator.user(authorization), spaceId, userId, roleId);
    }

    @DELETE
    @Path("/{spaceId}/members/{userId}/roles/{roleId}")
    public SpaceApi.MemberView unassignRole(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("userId") String userId,
            @PathParam("roleId") String roleId) {
        return guild.unassignRole(authenticator.user(authorization), spaceId, userId, roleId);
    }

    @GET
    @Path("/{spaceId}/roles")
    public List<SpaceApi.RoleView> roles(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId) {
        return guild.roles(authenticator.user(authorization), spaceId);
    }

    @POST
    @Path("/{spaceId}/roles")
    public SpaceApi.RoleView createRole(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @Body SpaceApi.CreateRoleRequest request) {
        return guild.createRole(authenticator.user(authorization), spaceId, request);
    }

    @PUT
    @Path("/{spaceId}/roles/{roleId}/position")
    public List<SpaceApi.RoleView> moveRole(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("roleId") String roleId,
            @Body SpaceApi.MoveRoleRequest request) {
        return guild.moveRole(authenticator.user(authorization), spaceId, roleId, request);
    }

    @PUT
    @Path("/{spaceId}/roles/{roleId}/power")
    public SpaceApi.RoleView setPower(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("roleId") String roleId,
            @Body SpaceApi.SetPowerRequest request) {
        return guild.setPower(authenticator.user(authorization), spaceId, roleId, request);
    }

    @DELETE
    @Path("/{spaceId}/roles/{roleId}")
    public void deleteRole(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId, @PathParam("roleId") String roleId) {
        guild.deleteRole(authenticator.user(authorization), spaceId, roleId);
    }

    @GET
    @Path("/{spaceId}/categories")
    public List<SpaceApi.CategoryView> categories(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId) {
        return guild.categories(authenticator.user(authorization), spaceId);
    }

    @POST
    @Path("/{spaceId}/categories")
    public SpaceApi.CategoryView createCategory(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @Body SpaceApi.CreateCategoryRequest request) {
        return guild.createCategory(authenticator.user(authorization), spaceId, request);
    }

    @GET
    @Path("/{spaceId}/channels")
    public List<SpaceApi.ChannelView> channels(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId) {
        return guild.channels(authenticator.user(authorization), spaceId);
    }

    @POST
    @Path("/{spaceId}/channels")
    public SpaceApi.ChannelView createChannel(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @Body SpaceApi.CreateChannelRequest request) {
        return guild.createChannel(authenticator.user(authorization), spaceId, request);
    }

    @PUT
    @Path("/{spaceId}/channels/{channelId}/required-join-power")
    public SpaceApi.ChannelView setRequiredJoinPower(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @PathParam("channelId") String channelId, @Body SpaceApi.SetValueRequest request) {
        return guild.setRequiredJoinPower(authenticator.user(authorization), spaceId, channelId, request);
    }

    @POST
    @Path("/{spaceId}/invites")
    public SpaceApi.InviteView createInvite(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @Body SpaceApi.CreateInviteRequest request) {
        return guild.createInvite(authenticator.user(authorization), spaceId, request);
    }
}
