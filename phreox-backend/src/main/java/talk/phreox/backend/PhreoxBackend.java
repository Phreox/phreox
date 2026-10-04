package talk.phreox.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import talk.phreox.backend.app.AppRuntime;
import talk.phreox.backend.bridge.BridgeConfig;

public final class PhreoxBackend {

    private static final Logger LOGGER = LoggerFactory.getLogger(PhreoxBackend.class);

    public static void main(String[] args) {
        var config = BridgeConfig.fromEnvironment(System.getenv());

        if (config.generatedToken()) {
            // Only reachable when started outside the Phreox app, which always passes its own token.
            LOGGER.warn("{} not set, generated development token: {}", BridgeConfig.TOKEN_VARIABLE, config.token());
        }

        var runtime = new AppRuntime(config);

        Runtime.getRuntime().addShutdownHook(Thread.ofPlatform().name("phreox-shutdown").unstarted(runtime::close));

        runtime.start();
    }
}
