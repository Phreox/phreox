package talk.phreox.space.permission;

import talk.phreox.api.ServerApi;
import talk.phreox.common.module.ServerModule;

import java.util.List;

public final class PermissionModule implements ServerModule {

    private final PermissionController controller;

    public PermissionModule(PermissionController controller) {
        this.controller = controller;
    }

    @Override
    public String name() {
        return "permissions";
    }

    @Override
    public List<String> capabilities() {
        return List.of(ServerApi.CAPABILITY_PERMISSIONS);
    }

    @Override
    public List<Object> controllers() {
        return List.of(controller);
    }
}
