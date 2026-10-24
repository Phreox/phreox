package talk.phreox.service.node;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;

import java.util.UUID;

/** Public lookups: clients check space nodes without an account. A missing node answers 404. */
@Path("/directory")
public final class DirectoryController {

    private final NodeRegistry registry;

    public DirectoryController(NodeRegistry registry) {
        this.registry = registry;
    }

    @GET
    @Path("/nodes/{nodeId}")
    public ServiceApi.SpaceNodeIdentity node(@PathParam("nodeId") UUID nodeId) {
        return registry.find(nodeId);
    }

    @GET
    @Path("/nodes")
    public ServiceApi.SpaceNodeIdentity byHost(@QueryParam("host") String host) {
        return registry.findByHost(host);
    }

    @POST
    @Path("/verify")
    public ServiceApi.VerifyResponse verify(@Body ServiceApi.SpaceNodeIdentity identity) {
        return registry.verify(identity);
    }
}
