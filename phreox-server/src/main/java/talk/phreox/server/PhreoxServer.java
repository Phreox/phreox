package talk.phreox.server;

import io.javalin.Javalin;
import talk.phreox.api.ApiRoutes;

public class PhreoxServer {

    public static void main(String[] args) {
        Javalin.create(config -> config.routes.get(ApiRoutes.HEALTH, ctx -> ctx.result("UP")))
                .start(8081);
    }
}
