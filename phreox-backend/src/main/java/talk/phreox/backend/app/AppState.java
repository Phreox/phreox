package talk.phreox.backend.app;

import talk.phreox.api.BackendApi;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

public final class AppState {

    private final long startedAt = System.currentTimeMillis();
    private final AtomicReference<BackendStatus> status = new AtomicReference<>(BackendStatus.STARTING);

    public BackendStatus status() {
        return status.get();
    }

    public void status(BackendStatus status) {
        this.status.set(status);
    }

    public long startedAt() {
        return startedAt;
    }

    public long uptime() {
        return System.currentTimeMillis() - startedAt;
    }

    public BackendApi.StateResponse snapshot(List<BackendApi.ModuleView> modules) {
        return new BackendApi.StateResponse(status().name(), startedAt, modules);
    }
}