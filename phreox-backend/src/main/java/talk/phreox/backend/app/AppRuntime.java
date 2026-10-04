package talk.phreox.backend.app;

import io.javalin.Javalin;
import talk.phreox.backend.bridge.BridgeConfig;
import talk.phreox.backend.bridge.FrontendBridge;
import talk.phreox.backend.event.EventBus;
import talk.phreox.backend.event.IEventBus;
import talk.phreox.backend.message.MessageModule;
import talk.phreox.backend.task.WorkEngine;

public final class AppRuntime implements AutoCloseable {

    private final AppState state = new AppState();
    private final IEventBus events = new EventBus();
    private final WorkEngine work = new WorkEngine();
    private final ModuleManager modules = new ModuleManager(events);
    private final BridgeConfig config;
    private final FrontendBridge bridge;

    private Javalin server;

    public AppRuntime(BridgeConfig config) {
        this.config = config;
        this.bridge = new FrontendBridge(config, state, modules, events);
    }

    public void start() {
        if (state.status() != BackendStatus.STARTING) {
            throw new IllegalStateException("Backend already started");
        }

        try {
            registerModules();

            modules.startAll();

            server = Javalin.create(javalin -> {
                javalin.jetty.host = BridgeConfig.HOST;
                javalin.jetty.port = config.port();

                bridge.configure(javalin);
            });

            server.start();

            state.status(BackendStatus.RUNNING);
            events.publish("backend.ready", state.snapshot(modules.snapshot()));
        } catch (RuntimeException exception) {
            state.status(BackendStatus.FAILED);
            close();

            throw exception;
        }
    }

    @Override
    public void close() {
        var status = state.status();

        if (status == BackendStatus.STOPPED || status == BackendStatus.STOPPING) {
            return;
        }

        state.status(BackendStatus.STOPPING);

        bridge.close();
        modules.stopAll();

        if (server != null) {
            server.stop();
        }

        work.close();

        state.status(BackendStatus.STOPPED);
    }

    public IEventBus events() {
        return events;
    }

    public WorkEngine work() {
        return work;
    }

    public ModuleManager modules() {
        return modules;
    }

    private void registerModules() {
        modules.register(new MessageModule(work, events));
    }
}