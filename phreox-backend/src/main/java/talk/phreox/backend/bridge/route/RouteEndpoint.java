package talk.phreox.backend.bridge.route;

import io.javalin.http.Context;
import io.javalin.http.Handler;
import io.javalin.http.HandlerType;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;

/** Void methods answer 204, a null result answers 404, everything else is serialized as JSON. */
public record RouteEndpoint(HandlerType method, String path, Object controller, Method target, List<ParameterBinding> parameters) implements Handler {

    public RouteEndpoint {
        parameters = List.copyOf(parameters);
    }

    @Override
    public void handle(Context context) throws Exception {
        var arguments = new Object[parameters.size()];

        for (var i = 0; i < arguments.length; i++) {
            arguments[i] = parameters.get(i).resolve(context);
        }

        var result = invoke(arguments);

        if (target.getReturnType() == void.class) {
            context.status(HttpStatus.NO_CONTENT);
            return;
        }

        if (result == null) {
            throw new NotFoundResponse();
        }

        context.json(result);
    }

    private Object invoke(Object[] arguments) throws Exception {
        try {
            return target.invoke(controller, arguments);
        } catch (InvocationTargetException exception) {
            if (exception.getCause() instanceof Exception cause) {
                throw cause;
            }

            throw exception;
        }
    }
}
