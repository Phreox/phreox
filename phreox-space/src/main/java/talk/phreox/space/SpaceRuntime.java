package talk.phreox.space;

import io.javalin.Javalin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import talk.phreox.api.ServerApi;
import talk.phreox.common.http.ServerHttp;
import talk.phreox.common.module.ModuleHost;
import talk.phreox.space.auth.Authenticator;
import talk.phreox.space.auth.DenyAllAuthenticator;
import talk.phreox.space.auth.DevAuthenticator;
import talk.phreox.space.event.EventController;
import talk.phreox.space.event.SpaceEvents;
import talk.phreox.space.guild.GuildController;
import talk.phreox.space.guild.GuildModule;
import talk.phreox.space.guild.GuildService;
import talk.phreox.space.guild.InMemorySpaceStore;
import talk.phreox.space.guild.InviteController;
import talk.phreox.space.guild.SpaceAccess;
import talk.phreox.space.message.InMemoryMessageStore;
import talk.phreox.space.message.MessageController;
import talk.phreox.space.message.MessageModule;
import talk.phreox.space.message.MessageService;
import talk.phreox.space.moderation.ModerationController;
import talk.phreox.space.moderation.ModerationModule;
import talk.phreox.space.moderation.ModerationService;
import talk.phreox.space.permission.PermissionController;
import talk.phreox.space.permission.PermissionModule;
import talk.phreox.space.permission.PermissionService;

import java.util.List;

public final class SpaceRuntime implements AutoCloseable {

    private static final Logger LOGGER = LoggerFactory.getLogger(SpaceRuntime.class);

    private final long startedAt = System.currentTimeMillis();
    private final ModuleHost modules = new ModuleHost();
    private final SpaceConfig config;

    private Javalin server;
    private boolean closed;

    public SpaceRuntime(SpaceConfig config) {
        this(config, config.devAuth() ? developmentAuthenticator() : new DenyAllAuthenticator());
    }

    public SpaceRuntime(SpaceConfig config, Authenticator authenticator) {
        this.config = config;

        var access = new SpaceAccess(new InMemorySpaceStore());
        var events = new SpaceEvents();
        var guild = new GuildService(access, events);

        modules.register(new GuildModule(List.of(new GuildController(authenticator, guild), new InviteController(authenticator, guild),
                new EventController(authenticator, access, events))));
        modules.register(new PermissionModule(new PermissionController(authenticator, new PermissionService(access))));
        modules.register(new MessageModule(new MessageController(authenticator, new MessageService(access, new InMemoryMessageStore(), events))));
        modules.register(new ModerationModule(new ModerationController(authenticator, new ModerationService(access, events))));
    }

    public synchronized void start() {
        if (server != null) {
            throw new IllegalStateException("Space already started");
        }

        modules.startAll();

        try {
            server = Javalin.create(javalin -> {
                javalin.jetty.host = config.host();
                javalin.jetty.port = config.port();

                ServerHttp.configure(javalin, ServerApi.AUTHORITY_SPACE, startedAt, modules, List.of());
            });

            server.start();
        } catch (RuntimeException exception) {
            close();
            throw exception;
        }
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

    public ModuleHost modules() {
        return modules;
    }

    private static Authenticator developmentAuthenticator() {
        LOGGER.warn("{} is enabled: every client can act as any user. Never use this in production.", SpaceConfig.DEV_AUTH_VARIABLE);

        return new DevAuthenticator();
    }
}
