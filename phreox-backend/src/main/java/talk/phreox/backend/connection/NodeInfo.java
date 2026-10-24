package talk.phreox.backend.connection;

import java.util.List;

/** Result of probing a phreox-service or phreox-space node. */
public record NodeInfo(NodeStatus status, List<String> capabilities, long checkedAt, String error) {

    public NodeInfo {
        capabilities = List.copyOf(capabilities);
    }

    public static NodeInfo connected(List<String> capabilities) {
        return new NodeInfo(NodeStatus.CONNECTED, capabilities, System.currentTimeMillis(), null);
    }

    public static NodeInfo unreachable(String error) {
        return new NodeInfo(NodeStatus.UNREACHABLE, List.of(), System.currentTimeMillis(), error);
    }

    public static NodeInfo notChecked() {
        return new NodeInfo(NodeStatus.NOT_CHECKED, List.of(), 0, null);
    }
}
