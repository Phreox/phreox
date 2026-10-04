package talk.phreox.backend.app;

import talk.phreox.api.BackendApi;
import talk.phreox.backend.event.IEventBus;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ModuleManager {

    private final Map<IBackendModule, ModuleStatus> modules = new LinkedHashMap<>();
    private final IEventBus events;

    public ModuleManager(IEventBus events) {
        this.events = events;
    }

    public synchronized void register(IBackendModule module) {
        if (contains(module.name())) {
            throw new IllegalStateException("Module already registered: " + module.name());
        }

        modules.put(module, ModuleStatus.CREATED);
    }

    public synchronized void startAll() {
        for (var module : modules.keySet()) {
            start(module);
        }
    }

    public synchronized void stopAll() {
        var list = new ArrayList<>(modules.keySet());

        for (var i = list.size() - 1; i >= 0; i--) {
            stop(list.get(i));
        }
    }

    public synchronized List<BackendApi.ModuleView> snapshot() {
        return modules.entrySet().stream()
                .map(entry -> new BackendApi.ModuleView(entry.getKey().name(), entry.getValue().name()))
                .toList();
    }

    private void start(IBackendModule module) {
        var status = modules.get(module);

        if (status == ModuleStatus.RUNNING) {
            return;
        }

        modules.put(module, ModuleStatus.STARTING);

        try {
            module.start();
            modules.put(module, ModuleStatus.RUNNING);
            events.publish("module.started", module.name());
        } catch (RuntimeException exception) {
            modules.put(module, ModuleStatus.FAILED);
            events.publish("module.failed", module.name());
            throw exception;
        }
    }

    private void stop(IBackendModule module) {
        var status = modules.get(module);

        if (status != ModuleStatus.RUNNING) {
            return;
        }

        modules.put(module, ModuleStatus.STOPPING);

        try {
            module.stop();
            modules.put(module, ModuleStatus.STOPPED);
            events.publish("module.stopped", module.name());
        } catch (RuntimeException exception) {
            modules.put(module, ModuleStatus.FAILED);
            events.publish("module.failed", module.name());
        }
    }

    private boolean contains(String name) {
        return modules.keySet().stream().anyMatch(module -> module.name().equals(name));
    }
}