package talk.phreox.service;

import io.javalin.Javalin;
import talk.phreox.api.ServerApi;
import talk.phreox.api.ServiceApi;
import talk.phreox.common.http.ServerHttp;
import talk.phreox.common.module.ModuleHost;
import talk.phreox.service.auth.AccountService;
import talk.phreox.service.auth.AuthController;
import talk.phreox.service.auth.LoginThrottle;
import talk.phreox.service.config.ServiceConfig;
import talk.phreox.service.crypto.PasswordHasher;
import talk.phreox.service.crypto.ServiceSigner;
import talk.phreox.service.device.DeviceController;
import talk.phreox.service.device.DeviceService;
import talk.phreox.service.dm.ConversationController;
import talk.phreox.service.dm.ConversationService;
import talk.phreox.service.entitlement.EntitlementController;
import talk.phreox.service.entitlement.EntitlementService;
import talk.phreox.service.friend.FriendController;
import talk.phreox.service.friend.FriendService;
import talk.phreox.service.node.DirectoryController;
import talk.phreox.service.node.NodeController;
import talk.phreox.service.node.NodeRegistry;

import java.time.Clock;
import java.util.List;

public final class ServiceRuntime implements AutoCloseable {

    private final ServiceConfig config;
    private final Clock clock;
    private final ModuleHost modules = new ModuleHost();

    private Javalin server;
    private boolean closed;

    public ServiceRuntime(ServiceConfig config) {
        this(config, Clock.systemUTC());
    }

    public ServiceRuntime(ServiceConfig config, Clock clock) {
        this.config = config;
        this.clock = clock;
    }

    public void start() {
        if (server != null) {
            throw new IllegalStateException("Service already started");
        }

        var signer = config.keyFile() == null ? ServiceSigner.generate() : ServiceSigner.loadOrCreate(config.keyFile());
        var accounts = new AccountService(new PasswordHasher(config.passwordIterations()), new LoginThrottle(clock), clock);
        var devices = new DeviceService(clock);
        var friends = new FriendService();
        var conversations = new ConversationService(friends, devices, signer, clock);
        var registry = new NodeRegistry(signer, config.reservedDomains(), clock);
        var entitlements = new EntitlementService(signer, clock);

        modules.register(new ControllerModule("identity", List.of(ServiceApi.CAPABILITY_IDENTITY), List.of(new AuthController(accounts))));
        modules.register(new ControllerModule("devices", List.of(ServiceApi.CAPABILITY_DEVICES), List.of(new DeviceController(accounts, devices, friends))));
        modules.register(new ControllerModule("friends", List.of(ServiceApi.CAPABILITY_FRIENDS), List.of(new FriendController(accounts, friends))));
        modules.register(new ControllerModule("dm", List.of(ServiceApi.CAPABILITY_DM, ServiceApi.CAPABILITY_GROUP_DM), List.of(new ConversationController(accounts, conversations))));
        modules.register(new ControllerModule("node-registry", List.of(ServiceApi.CAPABILITY_NODE_REGISTRY, ServiceApi.CAPABILITY_DIRECTORY), List.of(new NodeController(accounts, registry), new DirectoryController(registry))));
        modules.register(new ControllerModule("entitlements", List.of(ServiceApi.CAPABILITY_ENTITLEMENTS), List.of(new EntitlementController(accounts, entitlements, config.adminToken()))));

        try {
            modules.startAll();

            var startedAt = clock.millis();

            server = Javalin.create(javalin -> {
                javalin.jetty.host = config.host();
                javalin.jetty.port = config.port();

                ServerHttp.configure(javalin, ServerApi.AUTHORITY_SERVICE, startedAt, modules, List.of(new ServiceController(signer)));
            });

            server.start();
        } catch (RuntimeException exception) {
            close();
            throw exception;
        }
    }

    public int port() {
        if (server == null) {
            throw new IllegalStateException("Service not started");
        }

        return server.port();
    }

    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }

        closed = true;

        if (server != null) {
            server.stop();
        }

        modules.stopAll();
    }
}
