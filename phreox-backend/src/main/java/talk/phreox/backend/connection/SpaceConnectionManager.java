package talk.phreox.backend.connection;

import talk.phreox.api.ServerApi;
import talk.phreox.backend.event.IEventBus;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Keeps one connection per space home node, a user may be in spaces on many nodes at once. */
public final class SpaceConnectionManager {

    private static final int MAX_SPACES = 100;

    private final Map<String, Entry> spaces = new ConcurrentHashMap<>();
    private final NodeProbe probe;
    private final IEventBus events;

    private record Entry(String id, URI base, NodeInfo node) {

        SpaceConnection view() {
            return new SpaceConnection(id, base.toString(), node);
        }
    }

    public SpaceConnectionManager(NodeProbe probe, IEventBus events) {
        this.probe = probe;
        this.events = events;
    }

    public List<SpaceConnection> list() {
        return spaces.values().stream().map(Entry::view).toList();
    }

    public SpaceConnection get(String id) {
        var entry = spaces.get(id);

        return entry == null ? null : entry.view();
    }

    /** Probes the node first, a node that is not a phreox-space is never added. */
    public SpaceConnection add(String url) {
        var base = NodeProbe.validate(url);

        for (var existing : spaces.values()) {
            if (existing.base().equals(base)) {
                return existing.view();
            }
        }

        if (spaces.size() >= MAX_SPACES) {
            throw new IllegalArgumentException("Too many space connections");
        }

        var node = probe.probe(base, ServerApi.AUTHORITY_SPACE);

        if (node.status() != NodeStatus.CONNECTED) {
            throw new IllegalArgumentException(node.error());
        }

        var entry = new Entry(UUID.randomUUID().toString(), base, node);
        spaces.put(entry.id(), entry);
        events.publish("space.connected", entry.view());

        return entry.view();
    }

    public SpaceConnection refresh(String id) {
        var entry = spaces.get(id);

        if (entry == null) {
            return null;
        }

        var updated = new Entry(id, entry.base(), probe.probe(entry.base(), ServerApi.AUTHORITY_SPACE));
        spaces.replace(id, updated);
        events.publish(updated.node().status() == NodeStatus.CONNECTED ? "space.connected" : "space.unreachable", updated.view());

        return updated.view();
    }

    public boolean remove(String id) {
        var removed = spaces.remove(id);

        if (removed == null) {
            return false;
        }

        events.publish("space.disconnected", id);
        return true;
    }
}
