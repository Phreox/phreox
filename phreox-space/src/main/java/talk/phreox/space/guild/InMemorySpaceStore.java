package talk.phreox.space.guild;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public final class InMemorySpaceStore implements SpaceStore {

    private final Map<String, Space> spaces = new ConcurrentHashMap<>();

    @Override
    public void add(Space space) {
        spaces.put(space.id(), space);
    }

    @Override
    public Optional<Space> find(String spaceId) {
        return Optional.ofNullable(spaces.get(spaceId));
    }

    @Override
    public Optional<Space> findByChannel(String channelId) {
        return spaces.values().stream().filter(space -> space.channel(channelId).isPresent()).findFirst();
    }

    @Override
    public Optional<Space> findByInvite(String code) {
        return spaces.values().stream().filter(space -> space.invite(code).isPresent()).findFirst();
    }

    @Override
    public List<Space> all() {
        return List.copyOf(spaces.values());
    }
}
