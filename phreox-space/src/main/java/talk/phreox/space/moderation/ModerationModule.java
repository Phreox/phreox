package talk.phreox.space.moderation;

import talk.phreox.api.ServerApi;
import talk.phreox.common.module.ServerModule;

import java.util.List;

public final class ModerationModule implements ServerModule {

    private final ModerationController controller;

    public ModerationModule(ModerationController controller) {
        this.controller = controller;
    }

    @Override
    public String name() {
        return "moderation";
    }

    @Override
    public List<String> capabilities() {
        return List.of(ServerApi.CAPABILITY_MODERATION);
    }

    @Override
    public List<Object> controllers() {
        return List.of(controller);
    }
}
