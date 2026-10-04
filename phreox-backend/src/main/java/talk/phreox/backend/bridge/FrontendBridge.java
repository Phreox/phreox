package talk.phreox.backend.bridge;

import io.javalin.config.JavalinConfig;
import io.javalin.http.HttpStatus;
import io.javalin.json.JavalinJackson3;
import io.javalin.websocket.WsConfig;
import talk.phreox.api.ApiRoutes;
import talk.phreox.api.BackendApi;
import talk.phreox.backend.app.AppState;
import talk.phreox.backend.app.BackendController;
import talk.phreox.backend.app.ModuleManager;
import talk.phreox.backend.bridge.route.ControllerRouter;
import talk.phreox.backend.event.IEventBus;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public final class FrontendBridge {

    private final BridgeGuard guard;
    private final AppState state;
    private final ModuleManager modules;
    private final IEventBus events;
    private final ControllerRouter router = new ControllerRouter();
    private final Map<String, Runnable> subscriptions = new ConcurrentHashMap<>();

    public FrontendBridge(BridgeConfig config, AppState state, ModuleManager modules, IEventBus events) {
        this.guard = new BridgeGuard(config);
        this.state = state;
        this.modules = modules;
        this.events = events;
    }

    public void configure(JavalinConfig config) {
        config.jsonMapper(new JavalinJackson3());

        config.routes.before(guard::check);
        config.routes.wsBeforeUpgrade(guard::check);

        config.routes.exception(IllegalArgumentException.class, (exception, context) -> {
            context.status(HttpStatus.BAD_REQUEST).json(new BackendApi.ErrorResponse(exception.getMessage()));
        });

        router.register(config.routes, new BackendController(state, modules));

        for (var controller : modules.controllers()) {
            router.register(config.routes, controller);
        }

        config.routes.ws(ApiRoutes.BACKEND_EVENTS, this::configureEvents);
    }

    public void close() {
        subscriptions.values().forEach(Runnable::run);
        subscriptions.clear();
    }

    private void configureEvents(WsConfig ws) {
        ws.onConnect(ctx -> {
            var id = ctx.sessionId();
            var unsubscribe = events.subscribe(ctx::send);

            subscriptions.put(id, unsubscribe);

            ctx.enableAutomaticPings();
            ctx.send(events.publish("frontend.connected", null));
        });

        ws.onClose(ctx -> disconnect(ctx.sessionId()));

        ws.onError(ctx -> disconnect(ctx.sessionId()));
    }

    private void disconnect(String id) {
        var unsubscribe = subscriptions.remove(id);

        if (unsubscribe == null) {
            return;
        }

        unsubscribe.run();
    }
}
