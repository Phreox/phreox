package talk.phreox.backend.app;

import java.util.List;

public interface IBackendModule {

    String name();

    void start();

    void stop();

    /** Controllers written with the Phreox HTTP annotations; the bridge routes them. */
    default List<Object> controllers() {
        return List.of();
    }
}