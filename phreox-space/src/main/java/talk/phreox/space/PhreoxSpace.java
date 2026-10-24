package talk.phreox.space;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class PhreoxSpace {

    private static final Logger LOGGER = LoggerFactory.getLogger(PhreoxSpace.class);

    public static void main(String[] args) {
        var config = SpaceConfig.fromEnvironment(System.getenv());

        if (!config.devAuth()) {
            LOGGER.warn("No authenticator available for service tokens yet, all requests except health and capabilities are rejected. Set {}=true for development.",
                    SpaceConfig.DEV_AUTH_VARIABLE);
        }

        var runtime = new SpaceRuntime(config);

        Runtime.getRuntime().addShutdownHook(Thread.ofPlatform().name("phreox-space-shutdown").unstarted(runtime::close));

        runtime.start();
    }
}
