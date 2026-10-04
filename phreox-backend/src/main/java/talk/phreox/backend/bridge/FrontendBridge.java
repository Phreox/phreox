package talk.phreox.backend.bridge;

import io.javalin.config.JavalinConfig;
import talk.phreox.api.ApiRoutes;
import talk.phreox.api.BackendApi;
import talk.phreox.backend.app.AppState;
import talk.phreox.backend.app.ModuleManager;
import talk.phreox.backend.event.IEventBus;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public final class FrontendBridge {

    private final AppState state;
    private final ModuleManager modules;
    private final IEventBus events;
    private final Map<String, Runnable> subscriptions = new ConcurrentHashMap<>();

    public FrontendBridge(AppState state, ModuleManager modules, IEventBus events) {
        this.state = state;
        this.modules = modules;
        this.events = events;
    }

    public void configure(JavalinConfig config) {
        config.routes.get(ApiRoutes.HEALTH, ctx -> {
            ctx.json(new BackendApi.HealthResponse(state.status().name(), state.uptime()));
        });

        config.routes.get(ApiRoutes.BACKEND_STATE, ctx -> {
            ctx.json(state.snapshot(modules.snapshot()));
        });

        config.routes.ws(ApiRoutes.BACKEND_EVENTS, ws -> {
            ws.onConnect(ctx -> {
                var id = ctx.sessionId();
                var unsubscribe = events.subscribe(ctx::send);

                subscriptions.put(id, unsubscribe);

                ctx.enableAutomaticPings();
                ctx.send(events.publish("frontend.connected", null));
            });

            ws.onClose(ctx -> disconnect(ctx.sessionId()));

            ws.onError(ctx -> disconnect(ctx.sessionId()));
        });
    }

    public void close() {
        subscriptions.values().forEach(Runnable::run);
        subscriptions.clear();
    }

    private void disconnect(String id) {
        var unsubscribe = subscriptions.remove(id);

        if (unsubscribe == null) {
            return;
        }

        unsubscribe.run();
    }
}