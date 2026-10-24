package talk.phreox.service.node;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;
import talk.phreox.service.auth.AccountService;

import java.util.List;
import java.util.UUID;

@Path("/nodes")
public final class NodeController {

    private final AccountService accounts;
    private final NodeRegistry registry;

    public NodeController(AccountService accounts, NodeRegistry registry) {
        this.accounts = accounts;
        this.registry = registry;
    }

    @POST
    public ServiceApi.SpaceNodeIdentity register(@Header("Authorization") String authorization, @Body ServiceApi.RegisterNodeRequest request) {
        return registry.register(accounts.authenticate(authorization).id(), request);
    }

    @GET
    @Path("/owned")
    public List<ServiceApi.SpaceNodeIdentity> owned(@Header("Authorization") String authorization) {
        return registry.owned(accounts.authenticate(authorization).id());
    }

    @POST
    @Path("/{nodeId}/renew")
    public ServiceApi.SpaceNodeIdentity renew(@Header("Authorization") String authorization, @PathParam("nodeId") UUID nodeId, @QueryParam("ttlSeconds") Long ttlSeconds) {
        return registry.renew(accounts.authenticate(authorization).id(), nodeId, ttlSeconds);
    }

    @DELETE
    @Path("/{nodeId}")
    public void remove(@Header("Authorization") String authorization, @PathParam("nodeId") UUID nodeId) {
        registry.remove(accounts.authenticate(authorization).id(), nodeId);
    }
}
