package talk.phreox.backend;

import talk.phreox.backend.app.AppRuntime;

public final class PhreoxBackend {

    public static void main(String[] args) {
        var runtime = new AppRuntime();

        Runtime.getRuntime().addShutdownHook(Thread.ofPlatform().name("phreox-shutdown").unstarted(runtime::close));

        runtime.start();
    }
}