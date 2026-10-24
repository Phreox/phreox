package talk.phreox.space.guild;

import talk.phreox.api.ServerApi;
import talk.phreox.common.module.ServerModule;

import java.util.List;

public final class GuildModule implements ServerModule {

    private final List<Object> controllers;

    public GuildModule(List<Object> controllers) {
        this.controllers = List.copyOf(controllers);
    }

    @Override
    public String name() {
        return "guild";
    }

    @Override
    public List<String> capabilities() {
        return List.of(ServerApi.CAPABILITY_GUILD);
    }

    @Override
    public List<Object> controllers() {
        return controllers;
    }
}
