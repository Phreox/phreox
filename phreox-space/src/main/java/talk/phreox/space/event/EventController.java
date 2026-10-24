package talk.phreox.space.event;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.DefaultValue;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;
import talk.phreox.space.auth.Authenticator;
import talk.phreox.space.guild.SpaceAccess;

import java.util.List;

@Path("/spaces")
public final class EventController {

    private static final int MAX_LIMIT = 500;

    private final Authenticator authenticator;
    private final SpaceAccess access;
    private final SpaceEvents events;

    public EventController(Authenticator authenticator, SpaceAccess access, SpaceEvents events) {
        this.authenticator = authenticator;
        this.access = access;
        this.events = events;
    }

    /** Only events of channels the caller may see are returned. */
    @GET
    @Path("/{spaceId}/events")
    public List<SpaceApi.SpaceEvent> events(@Header("Authorization") String authorization, @PathParam("spaceId") String spaceId,
            @QueryParam("after") @DefaultValue("0") long after, @QueryParam("limit") @DefaultValue("100") int limit) {
        var user = authenticator.user(authorization);
        var space = access.memberSpace(spaceId, user);

        return events.after(spaceId, after).stream()
                .filter(event -> event.channelId() == null || space.channel(event.channelId()).filter(channel -> access.canView(space, user, channel)).isPresent())
                .limit(limit <= 0 ? 100 : Math.min(limit, MAX_LIMIT))
                .toList();
    }
}
