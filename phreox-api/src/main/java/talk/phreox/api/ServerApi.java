package talk.phreox.api;

import java.util.List;

/** Types shared by phreox-service and phreox-space. */
public final class ServerApi {

    public static final String CAPABILITY_GUILD = "guild";
    public static final String CAPABILITY_MESSAGING = "messaging";
    public static final String CAPABILITY_PERMISSIONS = "permissions";
    public static final String CAPABILITY_MODERATION = "moderation";
    public static final String CAPABILITY_STORAGE = "storage";
    public static final String CAPABILITY_SEARCH = "search";
    public static final String CAPABILITY_MEDIA = "media";

    public static final String AUTHORITY_SERVICE = "service";
    public static final String AUTHORITY_SPACE = "space";

    /** Capability advertisement of a node. It never proves entitlements, those come from phreox-service. */
    public record CapabilitiesResponse(int protocol, String authority, List<String> capabilities) {

        public CapabilitiesResponse {
            capabilities = List.copyOf(capabilities);
        }
    }

    public record HealthResponse(String status, long uptime) {
    }

    private ServerApi() {
    }
}
