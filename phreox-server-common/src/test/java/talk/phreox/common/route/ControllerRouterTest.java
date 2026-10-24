package talk.phreox.common.route;

import io.javalin.http.HandlerType;
import org.junit.jupiter.api.Test;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.PUT;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.DefaultValue;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ControllerRouterTest {

    private final ControllerRouter router = new ControllerRouter();

    @Test
    void resolvesRoutesAndBindings() {
        var endpoints = router.endpoints(new SampleController());

        var load = endpoint(endpoints, HandlerType.GET);
        assertEquals("/api/v1/samples/{id}", load.path());
        assertEquals(List.of(ParameterSource.PATH, ParameterSource.QUERY, ParameterSource.HEADER), load.parameters().stream().map(ParameterBinding::source).toList());
        assertEquals("20", load.parameters().get(1).defaultValue());

        assertEquals("/api/v1/samples", endpoint(endpoints, HandlerType.POST).path());
        assertEquals("/api/v1/samples/{id}", endpoint(endpoints, HandlerType.PUT).path());
        assertEquals("/api/v1/samples/{id}", endpoint(endpoints, HandlerType.DELETE).path());
        assertEquals(4, endpoints.size());
    }

    @Test
    void rejectsParameterWithoutBinding() {
        assertThrows(IllegalStateException.class, () -> router.endpoints(new UnboundParameterController()));
    }

    @Test
    void rejectsTwoHttpMethods() {
        assertThrows(IllegalStateException.class, () -> router.endpoints(new DoubleMethodController()));
    }

    @Test
    void rejectsUnsupportedScalarType() {
        assertThrows(IllegalStateException.class, () -> router.endpoints(new UnsupportedTypeController()));
    }

    private RouteEndpoint endpoint(List<RouteEndpoint> endpoints, HandlerType method) {
        return endpoints.stream().filter(endpoint -> endpoint.method() == method).findFirst().orElseThrow();
    }

    public record SampleRequest(String name) {
    }

    @Path("/samples")
    public static final class SampleController {

        @GET
        @Path("/{id}")
        public String load(@PathParam("id") String id, @QueryParam("limit") @DefaultValue("20") int limit, @Header("X-Trace") String trace) {
            return id;
        }

        @POST
        public String create(@Body SampleRequest request) {
            return request.name();
        }

        @PUT
        @Path("{id}")
        public String update(@PathParam("id") String id, @Body SampleRequest request) {
            return id;
        }

        @DELETE
        @Path("/{id}")
        public void delete(@PathParam("id") String id) {
        }

        public String notARoute() {
            return "";
        }
    }

    public static final class UnboundParameterController {

        @GET
        public String load(String id) {
            return id;
        }
    }

    public static final class DoubleMethodController {

        @GET
        @POST
        public String load() {
            return "";
        }
    }

    public static final class UnsupportedTypeController {

        @GET
        public String load(@QueryParam("values") List<String> values) {
            return "";
        }
    }
}
