package talk.phreox.service.crypto;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/** Unambiguous, length-prefixed encoding of the fields a signature covers, bound to a domain tag. */
public final class Canonical {

    private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    private final DataOutputStream out = new DataOutputStream(bytes);

    private Canonical() {
    }

    public static Canonical of(String domain) {
        return new Canonical().text(domain);
    }

    public Canonical text(String value) {
        var encoded = value.getBytes(StandardCharsets.UTF_8);

        write(() -> {
            out.writeInt(encoded.length);
            out.write(encoded);
        });

        return this;
    }

    public Canonical number(long value) {
        write(() -> out.writeLong(value));
        return this;
    }

    public Canonical uuid(UUID value) {
        return text(value.toString());
    }

    public Canonical list(List<String> values) {
        number(values.size());
        values.forEach(this::text);

        return this;
    }

    public byte[] bytes() {
        return bytes.toByteArray();
    }

    private void write(IoAction action) {
        try {
            action.run();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private interface IoAction {
        void run() throws IOException;
    }
}
