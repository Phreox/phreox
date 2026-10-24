package talk.phreox.space.guild;

import java.util.List;
import java.util.Optional;

public interface SpaceStore {

    void add(Space space);

    Optional<Space> find(String spaceId);

    Optional<Space> findByChannel(String channelId);

    Optional<Space> findByInvite(String code);

    List<Space> all();
}
