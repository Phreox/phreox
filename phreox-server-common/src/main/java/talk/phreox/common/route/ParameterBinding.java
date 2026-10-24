package talk.phreox.common.route;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.DefaultValue;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;

import java.lang.reflect.Parameter;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Set;
import java.util.UUID;

public record ParameterBinding(ParameterSource source, String name, Class<?> type, Type genericType, String defaultValue) {

    private static final Set<Class<?>> SCALAR_TYPES = Set.of(String.class, int.class, Integer.class, long.class, Long.class, boolean.class, Boolean.class, UUID.class);

    public static ParameterBinding of(Parameter parameter) {
        var bindings = new ArrayList<ParameterBinding>();
        var defaultValue = parameter.getAnnotation(DefaultValue.class);
        var fallback = defaultValue == null ? null : defaultValue.value();

        if (parameter.getAnnotation(PathParam.class) instanceof PathParam path) {
            bindings.add(scalar(ParameterSource.PATH, path.value(), parameter, null));
        }

        if (parameter.getAnnotation(QueryParam.class) instanceof QueryParam query) {
            bindings.add(scalar(ParameterSource.QUERY, query.value(), parameter, fallback));
        }

        if (parameter.getAnnotation(Header.class) instanceof Header header) {
            bindings.add(scalar(ParameterSource.HEADER, header.value(), parameter, fallback));
        }

        if (parameter.isAnnotationPresent(Body.class)) {
            bindings.add(new ParameterBinding(ParameterSource.BODY, "body", parameter.getType(), parameter.getParameterizedType(), null));
        }

        if (bindings.size() != 1) {
            throw new IllegalStateException("Parameter needs exactly one binding annotation: " + parameter);
        }

        return bindings.getFirst();
    }

    public Object resolve(Context context) {
        return switch (source) {
            case PATH -> convert(context.pathParam(name));
            case QUERY -> convert(context.queryParam(name));
            case HEADER -> convert(context.header(name));
            case BODY -> body(context);
        };
    }

    private static ParameterBinding scalar(ParameterSource source, String name, Parameter parameter, String defaultValue) {
        if (!SCALAR_TYPES.contains(parameter.getType())) {
            throw new IllegalStateException("Unsupported parameter type " + parameter.getType().getName() + ": " + parameter);
        }

        return new ParameterBinding(source, name, parameter.getType(), parameter.getType(), defaultValue);
    }

    private Object convert(String value) {
        var text = value == null ? defaultValue : value;

        if (text == null && type.isPrimitive()) {
            throw new BadRequestResponse("Missing parameter: " + name);
        }

        if (text == null) {
            return null;
        }

        try {
            return parse(text);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestResponse("Invalid parameter: " + name);
        }
    }

    private Object parse(String text) {
        if (type == int.class || type == Integer.class) {
            return Integer.parseInt(text);
        }

        if (type == long.class || type == Long.class) {
            return Long.parseLong(text);
        }

        if (type == boolean.class || type == Boolean.class) {
            return parseBoolean(text);
        }

        if (type == UUID.class) {
            return UUID.fromString(text);
        }

        return text;
    }

    private static boolean parseBoolean(String text) {
        if (text.equals("true")) {
            return true;
        }

        if (text.equals("false")) {
            return false;
        }

        throw new IllegalArgumentException("Not a boolean: " + text);
    }

    private Object body(Context context) {
        try {
            return context.bodyAsClass(genericType);
        } catch (RuntimeException exception) {
            throw new BadRequestResponse("Invalid request body");
        }
    }
}
