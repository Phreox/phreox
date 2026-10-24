package talk.phreox.common.module;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

/** Starts modules in registration order and stops them in reverse order. */
public final class ModuleHost {

    private static final Logger LOGGER = LoggerFactory.getLogger(ModuleHost.class);

    private final List<ServerModule> modules = new ArrayList<>();
    private final List<ServerModule> started = new ArrayList<>();

    public synchronized void register(ServerModule module) {
        if (modules.stream().anyMatch(existing -> existing.name().equals(module.name()))) {
            throw new IllegalStateException("Module already registered: " + module.name());
        }

        modules.add(module);
    }

    /** A failing module stops the ones already started and rethrows. */
    public synchronized void startAll() {
        try {
            for (var module : modules) {
                module.start();
                started.add(module);
            }
        } catch (RuntimeException exception) {
            stopAll();
            throw exception;
        }
    }

    public synchronized void stopAll() {
        for (var i = started.size() - 1; i >= 0; i--) {
            var module = started.get(i);

            try {
                module.stop();
            } catch (RuntimeException exception) {
                LOGGER.error("Module {} failed to stop", module.name(), exception);
            }
        }

        started.clear();
    }

    public synchronized List<String> capabilities() {
        return modules.stream().flatMap(module -> module.capabilities().stream()).distinct().toList();
    }

    public synchronized List<Object> controllers() {
        return modules.stream().flatMap(module -> module.controllers().stream()).toList();
    }

    public synchronized List<String> names() {
        return modules.stream().map(ServerModule::name).toList();
    }
}
