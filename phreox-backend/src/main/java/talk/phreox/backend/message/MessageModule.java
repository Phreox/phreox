package talk.phreox.backend.message;

import talk.phreox.backend.app.IBackendModule;
import talk.phreox.backend.event.IEventBus;
import talk.phreox.backend.task.WorkEngine;

import java.util.List;

public final class MessageModule implements IBackendModule {

    private final WorkEngine work;
    private final IEventBus events;
    private final MessageEngine engine;

    public MessageModule(WorkEngine work, IEventBus events) {
        this.work = work;
        this.events = events;
        this.engine = new MessageEngine(events);
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

    @Override
    public List<Object> controllers() {
        return List.of(new MessageController(engine));
    }
}