package talk.phreox.common.route;

import io.javalin.http.HandlerType;
import io.javalin.router.JavalinDefaultRoutingApi;
import talk.phreox.api.ApiRoutes;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.PATCH;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.PUT;
import talk.phreox.api.http.Path;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Maps controllers written with the Phreox annotations onto Javalin, so controllers never see the HTTP library. */
public final class ControllerRouter {

    private static final Map<Class<? extends Annotation>, HandlerType> HTTP_METHODS = Map.of(
            GET.class, HandlerType.GET,
            POST.class, HandlerType.POST,
            PUT.class, HandlerType.PUT,
            PATCH.class, HandlerType.PATCH,
            DELETE.class, HandlerType.DELETE);

    public List<RouteEndpoint> register(JavalinDefaultRoutingApi routes, Object controller) {
        var endpoints = endpoints(controller);

        for (var endpoint : endpoints) {
            routes.addHttpHandler(endpoint.method(), endpoint.path(), endpoint);
        }

        return endpoints;
    }

    public List<RouteEndpoint> endpoints(Object controller) {
        var type = controller.getClass();
        var basePath = ApiRoutes.PREFIX + segment(type.getAnnotation(Path.class));
        var endpoints = new ArrayList<RouteEndpoint>();

        for (var method : type.getMethods()) {
            var httpMethod = httpMethod(method);

            if (httpMethod == null) {
                continue;
            }

            endpoints.add(endpoint(controller, method, httpMethod, basePath));
        }

        return List.copyOf(endpoints);
    }

    private RouteEndpoint endpoint(Object controller, Method method, HandlerType httpMethod, String basePath) {
        if (Modifier.isStatic(method.getModifiers())) {
            throw new IllegalStateException("Route method must not be static: " + method);
        }

        var path = basePath + segment(method.getAnnotation(Path.class));
        var parameters = Arrays.stream(method.getParameters()).map(ParameterBinding::of).toList();

        return new RouteEndpoint(httpMethod, path, controller, method, parameters);
    }

    private HandlerType httpMethod(Method method) {
        var matches = HTTP_METHODS.entrySet().stream()
                .filter(entry -> method.isAnnotationPresent(entry.getKey()))
                .map(Map.Entry::getValue)
                .toList();

        if (matches.size() > 1) {
            throw new IllegalStateException("Route method has more than one HTTP method: " + method);
        }

        return matches.isEmpty() ? null : matches.getFirst();
    }

    private String segment(Path path) {
        if (path == null || path.value().isEmpty()) {
            return "";
        }

        return path.value().startsWith("/") ? path.value() : "/" + path.value();
    }
}
