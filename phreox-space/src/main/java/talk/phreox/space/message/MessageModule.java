package talk.phreox.space.message;

import talk.phreox.api.ServerApi;
import talk.phreox.common.module.ServerModule;

import java.util.List;

public final class MessageModule implements ServerModule {

    private final MessageController controller;

    public MessageModule(MessageController controller) {
        this.controller = controller;
    }

    @Override
    public String name() {
        return "messaging";
    }

    @Override
    public List<String> capabilities() {
        return List.of(ServerApi.CAPABILITY_MESSAGING);
    }

    @Override
    public List<Object> controllers() {
        return List.of(controller);
    }
}
