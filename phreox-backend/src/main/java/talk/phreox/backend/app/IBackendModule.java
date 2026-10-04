package talk.phreox.backend.app;

public interface IBackendModule {

    String name();

    void start();

    void stop();
}