package talk.phreox.backend.message;

import talk.phreox.backend.app.IBackendModule;
import talk.phreox.backend.event.IEventBus;
import talk.phreox.backend.task.WorkEngine;

public final class MessageModule implements IBackendModule {

    private final WorkEngine work;
    private final IEventBus events;

    public MessageModule(WorkEngine work, IEventBus events) {
        this.work = work;
        this.events = events;
    }

    @Override
    public String name() {
        return "messages";
    }

    @Override
    public void start() {
        events.publish("messages.ready", null);
    }

    @Override
    public void stop() {
    }
}