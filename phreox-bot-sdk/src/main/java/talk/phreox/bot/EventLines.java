package talk.phreox.bot;

import java.util.function.BiConsumer;

/** Reads the lines of a Server-Sent Events stream (as the service sends them) and tells every complete event: its name and its data. */
final class EventLines {

    private final BiConsumer<String, String> listener;
    private String name = "message";
    private final StringBuilder data = new StringBuilder();

    EventLines(BiConsumer<String, String> listener) {
        this.listener = listener;
    }

    void line(String line) {
        // An empty line ends an event.
        if (line.isEmpty()) {
            finish();
            return;
        }

        // A line that starts with a colon is a comment, such as the keep-alive.
        if (line.startsWith(":")) {
            return;
        }

        var colon = line.indexOf(':');
        var field = colon < 0 ? line : line.substring(0, colon);
        var value = colon < 0 ? "" : line.substring(colon + 1).stripLeading();

        switch (field) {
            case "event" -> name = value;
            case "data" -> data.append(data.isEmpty() ? "" : "\n").append(value);
            default -> {
            }
        }
    }

    private void finish() {
        if (!data.isEmpty()) {
            listener.accept(name, data.toString());
        }

        name = "message";
        data.setLength(0);
    }
}
