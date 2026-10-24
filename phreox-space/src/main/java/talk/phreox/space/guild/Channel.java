package talk.phreox.space.guild;

import talk.phreox.api.pxp.ConversationMode;

public final class Channel {

    private final String id;
    private final String categoryId;
    private final String name;
    private final ConversationMode mode;
    private final long createdAt;

    private volatile short requiredJoinPower;

    Channel(String id, String categoryId, String name, ConversationMode mode, long createdAt) {
        this.id = id;
        this.categoryId = categoryId;
        this.name = name;
        this.mode = mode;
        this.createdAt = createdAt;
    }

    public String id() {
        return id;
    }

    public String categoryId() {
        return categoryId;
    }

    public String name() {
        return name;
    }

    public ConversationMode mode() {
        return mode;
    }

    public long createdAt() {
        return createdAt;
    }

    public short requiredJoinPower() {
        return requiredJoinPower;
    }

    public void requiredJoinPower(short requiredJoinPower) {
        this.requiredJoinPower = requiredJoinPower;
    }
}
