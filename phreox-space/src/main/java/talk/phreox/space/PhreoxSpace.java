package talk.phreox.space;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import talk.phreox.space.auth.ServiceKeys;

public final class PhreoxSpace {

    private static final Logger LOGGER = LoggerFactory.getLogger(PhreoxSpace.class);

    public static void main(String[] args) {
        var config = SpaceConfig.fromEnvironment(System.getenv());

        if (config.serviceKey() == null && config.serviceUrl() != null) {
            config = config.withServiceKey(ServiceKeys.fetch(config.serviceUrl()));
            LOGGER.info("Using the service key fetched from the configured service URL. Pin it with {} to avoid trusting the first answer.", SpaceConfig.SERVICE_KEY_VARIABLE);
        }

        if (!config.devAuth() && !config.tokenAuth()) {
            LOGGER.warn("No authentication configured, all requests except health and capabilities are rejected. Set {} (and {}) or {}=true for development.",
                    SpaceConfig.SERVICE_KEY_VARIABLE, SpaceConfig.AUDIENCE_VARIABLE, SpaceConfig.DEV_AUTH_VARIABLE);
        }

        var runtime = new SpaceRuntime(config);

        Runtime.getRuntime().addShutdownHook(Thread.ofPlatform().name("phreox-space-shutdown").unstarted(runtime::close));

        runtime.start();
    }
}
