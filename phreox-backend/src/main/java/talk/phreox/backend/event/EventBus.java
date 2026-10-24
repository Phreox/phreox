package talk.phreox.backend.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import talk.phreox.api.BackendApi;

import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

public final class EventBus implements IEventBus {

    private static final Logger LOGGER = LoggerFactory.getLogger(EventBus.class);

    private final AtomicLong sequence = new AtomicLong();
    private final CopyOnWriteArrayList<Consumer<BackendApi.Event>> listeners = new CopyOnWriteArrayList<>();

    @Override
    public BackendApi.Event publish(String type, Object data) {
        var event = new BackendApi.Event(sequence.incrementAndGet(), type, System.currentTimeMillis(), data);

        for (var listener : listeners) {
            dispatch(listener, event);
        }

        return event;
    }

    @Override
    public Runnable subscribe(Consumer<BackendApi.Event> listener) {
        listeners.add(listener);

        return () -> listeners.remove(listener);
    }

    private void dispatch(Consumer<BackendApi.Event> listener, BackendApi.Event event) {
        try {
            listener.accept(event);
        } catch (RuntimeException exception) {
            LOGGER.warn("Event listener failed", exception);
        }
    }
}