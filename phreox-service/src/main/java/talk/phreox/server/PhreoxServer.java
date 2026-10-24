package talk.phreox.server;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import talk.phreox.service.ServiceRuntime;
import talk.phreox.service.config.ServiceConfig;

public final class PhreoxServer {

    private static final Logger LOGGER = LoggerFactory.getLogger(PhreoxServer.class);

    public static void main(String[] args) {
        var config = ServiceConfig.fromEnvironment(System.getenv());

        if (config.keyFile() == null) {
            LOGGER.warn("{} not set, the signing key is generated per start and signatures will not survive a restart", ServiceConfig.KEY_FILE_VARIABLE);
        }

        var runtime = new ServiceRuntime(config);

        Runtime.getRuntime().addShutdownHook(Thread.ofPlatform().name("phreox-service-shutdown").unstarted(runtime::close));

        runtime.start();

        LOGGER.info("phreox-service listening on {}:{}", config.host(), runtime.port());
    }

    private PhreoxServer() {
    }
}
