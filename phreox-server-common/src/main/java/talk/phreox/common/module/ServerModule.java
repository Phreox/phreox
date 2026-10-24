package talk.phreox.common.module;

import java.util.List;

/** A capability of a server runtime. Modules are not processes, one JVM may host all of them. */
public interface ServerModule {

    String name();

    /** Capability names advertised to clients, see ServerApi. */
    List<String> capabilities();

    default void start() {
    }

    default void stop() {
    }

    /** Controllers written with the Phreox HTTP annotations. */
    default List<Object> controllers() {
        return List.of();
    }
}
