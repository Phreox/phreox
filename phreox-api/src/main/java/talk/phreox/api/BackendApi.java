package talk.phreox.api;

import java.util.List;

public final class BackendApi {

    public record HealthResponse(String status, long uptime) {
    }

    public record StateResponse(String status, long startedAt, List<ModuleView> modules) {
    }

    public record ModuleView(String name, String status) {
    }

    public record Event(long sequence, String type, long timestamp, Object data) {
    }

    private BackendApi() {
    }
}