package talk.phreox.api.pxp;

public enum FrameType {
    HELLO(0x01),
    HELLO_ACK(0x02),
    PING(0x03),
    PONG(0x04),
    ERROR(0x05),
    ACK(0x06),
    CONTROL(0x10),
    EVENT(0x20),
    MLS_HANDSHAKE(0x30),
    MLS_APPLICATION(0x31),
    MEDIA_CONTROL(0x40),
    /** Received type this client does not know; never written. */
    UNKNOWN(-1);

    private final int code;

    FrameType(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static FrameType of(int code) {
        for (var type : values()) {
            if (type.code == code) {
                return type;
            }
        }

        return UNKNOWN;
    }
}
