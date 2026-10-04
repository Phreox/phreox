package talk.phreox.backend.event;

import talk.phreox.api.BackendApi;

import java.util.function.Consumer;

public interface IEventBus {

    BackendApi.Event publish(String type, Object data);

    Runnable subscribe(Consumer<BackendApi.Event> listener);
}