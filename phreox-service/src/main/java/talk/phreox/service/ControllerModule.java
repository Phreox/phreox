package talk.phreox.service;

import talk.phreox.common.module.ServerModule;

import java.util.List;

public record ControllerModule(String name, List<String> capabilities, List<Object> controllers) implements ServerModule {
}
