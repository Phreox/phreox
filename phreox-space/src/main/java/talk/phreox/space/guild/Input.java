package talk.phreox.space.guild;

import talk.phreox.api.http.ApiException;

/** Validation of request values; failures answer 400. */
public final class Input {

    private static final int MAX_NAME_LENGTH = 100;

    private Input() {
    }

    public static String name(String value) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("Name is empty");
        }

        var name = value.strip();

        if (name.length() > MAX_NAME_LENGTH) {
            throw ApiException.badRequest("Name exceeds " + MAX_NAME_LENGTH + " characters");
        }

        return name;
    }

    public static <E extends Enum<E>> E enumValue(Class<E> type, String value, String field) {
        if (value == null) {
            throw ApiException.badRequest("Missing " + field);
        }

        try {
            return Enum.valueOf(type, value.strip().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw ApiException.badRequest("Invalid " + field + ": " + value);
        }
    }

    public static <E extends Enum<E>> E enumValue(Class<E> type, String value, String field, E fallback) {
        return value == null ? fallback : enumValue(type, value, field);
    }

    public static <T> T body(T request) {
        if (request == null) {
            throw ApiException.badRequest("Missing request body");
        }

        return request;
    }
}
