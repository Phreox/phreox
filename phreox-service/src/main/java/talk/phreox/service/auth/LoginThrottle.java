package talk.phreox.service.auth;

import talk.phreox.api.http.ApiException;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Locks a login key for the rest of the window after too many recent failures. */
public final class LoginThrottle {

    private static final int MAX_FAILURES = 5;
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final int PRUNE_THRESHOLD = 10_000;

    private final Map<String, Deque<Long>> failures = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    public void check(String key) {
        var recent = failures.get(key);

        if (recent == null) {
            return;
        }

        synchronized (recent) {
            expire(recent);

            if (recent.size() >= MAX_FAILURES) {
                throw ApiException.forbidden("Too many failed attempts, try again later");
            }
        }
    }

    public void failure(String key) {
        if (failures.size() > PRUNE_THRESHOLD) {
            failures.values().removeIf(recent -> {
                synchronized (recent) {
                    expire(recent);
                    return recent.isEmpty();
                }
            });
        }

        var recent = failures.computeIfAbsent(key, ignored -> new ArrayDeque<>());

        synchronized (recent) {
            recent.addLast(clock.millis());
        }
    }

    public void success(String key) {
        failures.remove(key);
    }

    private void expire(Deque<Long> recent) {
        var limit = clock.millis() - WINDOW.toMillis();

        while (!recent.isEmpty() && recent.peekFirst() <= limit) {
            recent.removeFirst();
        }
    }
}
