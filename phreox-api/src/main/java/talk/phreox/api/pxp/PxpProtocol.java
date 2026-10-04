package talk.phreox.api.pxp;

import java.util.UUID;

public final class PxpProtocol {

    public static final int VERSION = 1;
    public static final String ALPN = "pxp/" + VERSION;

    public static final int HEADER_SIZE = 34;
    public static final int MAX_PAYLOAD_LENGTH = 16 * 1024 * 1024;

    public static final UUID NO_CONVERSATION = new UUID(0, 0);

    private PxpProtocol() {
    }
}
