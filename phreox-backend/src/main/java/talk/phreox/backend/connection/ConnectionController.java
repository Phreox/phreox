package talk.phreox.backend.connection;

import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.PathParam;

import java.util.List;

@Path("/connections")
public final class ConnectionController {

    public record AddSpaceRequest(String url) {
    }

    private final ServiceConnection service;
    private final SpaceConnectionManager spaces;

    public ConnectionController(ServiceConnection service, SpaceConnectionManager spaces) {
        this.service = service;
        this.spaces = spaces;
    }

    @GET
    @Path("/service")
    public ServiceConnection.View service() {
        return service.view();
    }

    @POST
    @Path("/service/refresh")
    public ServiceConnection.View refreshService() {
        return service.refresh().join();
    }

    @GET
    @Path("/spaces")
    public List<SpaceConnection> spaces() {
        return spaces.list();
    }

    @POST
    @Path("/spaces")
    public SpaceConnection add(@Body AddSpaceRequest request) {
        return spaces.add(request == null ? null : request.url());
    }

    @POST
    @Path("/spaces/{id}/refresh")
    public SpaceConnection refresh(@PathParam("id") String id) {
        return spaces.refresh(id);
    }

    @DELETE
    @Path("/spaces/{id}")
    public void remove(@PathParam("id") String id) {
        spaces.remove(id);
    }
}
