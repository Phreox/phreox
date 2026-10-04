package talk.phreox.api;

/** Routes shared by backend and server. */
public final class ApiRoutes {

    public static final int VERSION = 1;

    public static final String ROOT = "/api";
    public static final String PREFIX = ROOT + "/v" + VERSION;

    public static final String HEALTH = PREFIX + "/health";
    public static final String BACKEND_STATE = PREFIX + "/backend/state";
    public static final String BACKEND_EVENTS = PREFIX + "/backend/events";

    private ApiRoutes() {
    }
}
