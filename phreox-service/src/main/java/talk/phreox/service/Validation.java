package talk.phreox.service;

import java.util.Base64;

public final class Validation {

    private Validation() {
    }

    public static String text(String value, String name, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " is empty");
        }

        if (value.length() > maxLength) {
            throw new IllegalArgumentException(name + " exceeds " + maxLength + " characters");
        }

        return value.strip();
    }

    /** Opaque Base64 blob, returns the decoded bytes. */
    public static byte[] base64(String value, String name, int maxBytes) {
        if (value == null || value.isEmpty()) {
            throw new IllegalArgumentException(name + " is empty");
        }

        if (value.length() > maxBytes * 4L / 3 + 4) {
            throw new IllegalArgumentException(name + " exceeds " + maxBytes + " bytes");
        }

        try {
            var bytes = Base64.getDecoder().decode(value);

            if (bytes.length > maxBytes) {
                throw new IllegalArgumentException(name + " exceeds " + maxBytes + " bytes");
            }

            return bytes;
        } catch (IllegalArgumentException exception) {
            if (exception.getMessage() != null && exception.getMessage().startsWith(name)) {
                throw exception;
            }

            throw new IllegalArgumentException(name + " is not valid Base64");
        }
    }
}
