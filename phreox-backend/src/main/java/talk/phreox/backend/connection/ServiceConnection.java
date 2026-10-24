package talk.phreox.backend.connection;

import talk.phreox.api.ServerApi;
import talk.phreox.backend.event.IEventBus;
import talk.phreox.backend.task.WorkEngine;

import java.net.URI;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

/** The connection to phreox-service, which every client needs. */
public final class ServiceConnection {

    public record View(String url, NodeInfo node) {
    }

    private final URI base;
    private final NodeProbe probe;
    private final WorkEngine work;
    private final IEventBus events;
    private final AtomicReference<NodeInfo> info = new AtomicReference<>(NodeInfo.notChecked());

    public ServiceConnection(String url, NodeProbe probe, WorkEngine work, IEventBus events) {
        this.base = url == null || url.isBlank() ? null : NodeProbe.validate(url);
        this.probe = probe;
        this.work = work;
        this.events = events;
    }

    public boolean configured() {
        return base != null;
    }

    public View view() {
        return new View(base == null ? null : base.toString(), info.get());
    }

    public CompletableFuture<View> refresh() {
        if (base == null) {
            return CompletableFuture.completedFuture(view());
        }

        return work.io(() -> {
            info.set(probe.probe(base, ServerApi.AUTHORITY_SERVICE));
            events.publish("service.status", view());

            return view();
        });
    }
}
