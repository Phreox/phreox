package talk.phreox.space.guild;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.space.auth.Authenticator;

@Path("/invites")
public final class InviteController {

    private final Authenticator authenticator;
    private final GuildService guild;

    public InviteController(Authenticator authenticator, GuildService guild) {
        this.authenticator = authenticator;
        this.guild = guild;
    }

    @POST
    @Path("/{code}/join")
    public SpaceApi.MemberView join(@Header("Authorization") String authorization, @PathParam("code") String code) {
        return guild.join(authenticator.user(authorization), code);
    }
}
