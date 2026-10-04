package talk.phreox.backend.app;

import talk.phreox.api.BackendApi;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.Path;

@Path("/backend")
public final class BackendController {

    private final AppState state;
    private final ModuleManager modules;

    public BackendController(AppState state, ModuleManager modules) {
        this.state = state;
        this.modules = modules;
    }

    @GET
    @Path("/state")
    public BackendApi.StateResponse state() {
        return state.snapshot(modules.snapshot());
    }

    @GET
    @Path("/health")
    public BackendApi.HealthResponse health() {
        return new BackendApi.HealthResponse(state.status().name(), state.uptime());
    }
}