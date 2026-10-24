package talk.phreox.backend.connection;

import talk.phreox.backend.app.IBackendModule;
import talk.phreox.backend.event.IEventBus;
import talk.phreox.backend.task.WorkEngine;

import java.util.List;

public final class ConnectionModule implements IBackendModule {

    private final ServiceConnection service;
    private final SpaceConnectionManager spaces;

    public ConnectionModule(String serviceUrl, WorkEngine work, IEventBus events) {
        var probe = new NodeProbe();

        this.service = new ServiceConnection(serviceUrl, probe, work, events);
        this.spaces = new SpaceConnectionManager(probe, events);
    }

    @Override
    public String name() {
        return "connections";
    }

    @Override
    public void start() {
        service.refresh();
    }

    @Override
    public void stop() {
    }

    @Override
    public List<Object> controllers() {
        return List.of(new ConnectionController(service, spaces));
    }
}
