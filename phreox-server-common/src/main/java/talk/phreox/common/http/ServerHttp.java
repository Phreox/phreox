package talk.phreox.common.http;

import io.javalin.config.JavalinConfig;
import io.javalin.http.HttpStatus;
import io.javalin.json.JavalinJackson3;
import talk.phreox.api.ApiRoutes;
import talk.phreox.api.BackendApi;
import talk.phreox.api.ServerApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.api.pxp.PxpProtocol;
import talk.phreox.common.module.ModuleHost;
import talk.phreox.common.route.ControllerRouter;

import java.util.List;

/** HTTP setup shared by phreox-service and phreox-space. */
public final class ServerHttp {

    private ServerHttp() {
    }

    /** Public discovery routes (health, capabilities) are registered here, everything else is a module controller. */
    public static void configure(JavalinConfig config, String authority, long startedAt, ModuleHost modules, List<Object> additionalControllers) {
        config.jsonMapper(new JavalinJackson3());

        config.routes.exception(ApiException.class, (exception, context) -> {
            context.status(exception.status()).json(new BackendApi.ErrorResponse(exception.getMessage()));
        });

        config.routes.exception(IllegalArgumentException.class, (exception, context) -> {
            context.status(HttpStatus.BAD_REQUEST).json(new BackendApi.ErrorResponse(exception.getMessage()));
        });

        config.routes.get(ApiRoutes.HEALTH, context -> {
            context.json(new ServerApi.HealthResponse("RUNNING", System.currentTimeMillis() - startedAt));
        });

        config.routes.get(ApiRoutes.CAPABILITIES, context -> {
            context.json(new ServerApi.CapabilitiesResponse(PxpProtocol.VERSION, authority, modules.capabilities()));
        });

        var router = new ControllerRouter();

        for (var controller : modules.controllers()) {
            router.register(config.routes, controller);
        }

        for (var controller : additionalControllers) {
            router.register(config.routes, controller);
        }
    }
}
