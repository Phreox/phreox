package talk.phreox.space.event;

import talk.phreox.api.SpaceApi;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/** Bounded per-space event log that clients poll with the last sequence they saw. */
public final class SpaceEvents {

    private static final int MAX_EVENTS = 1000;

    private final AtomicLong sequence = new AtomicLong();
    private final Map<String, Deque<SpaceApi.SpaceEvent>> events = new ConcurrentHashMap<>();

    public SpaceApi.SpaceEvent publish(String spaceId, String type, String channelId, Object data) {
        var log = events.computeIfAbsent(spaceId, id -> new ArrayDeque<>());

        synchronized (log) {
            var event = new SpaceApi.SpaceEvent(sequence.incrementAndGet(), spaceId, type, System.currentTimeMillis(), channelId, data);

            log.add(event);

            if (log.size() > MAX_EVENTS) {
                log.removeFirst();
            }

            return event;
        }
    }

    public List<SpaceApi.SpaceEvent> after(String spaceId, long after) {
        var log = events.get(spaceId);

        if (log == null) {
            return List.of();
        }

        synchronized (log) {
            return new ArrayList<>(log.stream().filter(event -> event.sequence() > after).toList());
        }
    }
}
