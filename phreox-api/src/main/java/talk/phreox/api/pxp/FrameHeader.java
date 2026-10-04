package talk.phreox.api.pxp;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.UUID;

public record FrameHeader(int version, FrameType type, int flags, CipherSuite cipherSuite, UUID conversationId, long sequence, int payloadLength) {

    public static final int FLAG_CRITICAL = 1;
    public static final int FLAG_ACK_REQUESTED = 1 << 1;

    private static final int KNOWN_FLAGS = FLAG_CRITICAL | FLAG_ACK_REQUESTED;
    private static final int MAX_VERSION = 0xFF;

    public FrameHeader {
        if (type == null || cipherSuite == null || conversationId == null) {
            throw new PxpException("Frame header is incomplete");
        }

        if (version < 1 || version > MAX_VERSION) {
            throw new PxpException("Invalid protocol version: " + version);
        }

        if ((flags & ~KNOWN_FLAGS) != 0) {
            throw new PxpException("Unknown frame flags: " + Integer.toBinaryString(flags));
        }

        if (sequence < 0) {
            throw new PxpException("Sequence out of range: " + sequence);
        }

        if (payloadLength < 0 || payloadLength > PxpProtocol.MAX_PAYLOAD_LENGTH) {
            throw new PxpException("Payload length out of range: " + payloadLength);
        }
    }

    public static FrameHeader of(FrameType type, int flags, CipherSuite cipherSuite, UUID conversationId, long sequence, int payloadLength) {
        return new FrameHeader(PxpProtocol.VERSION, type, flags, cipherSuite, conversationId, sequence, payloadLength);
    }

    public static FrameHeader read(ByteBuffer buffer) {
        requireHeader(buffer);

        var version = Byte.toUnsignedInt(buffer.get());

        if (version != PxpProtocol.VERSION) {
            throw new PxpException("Unsupported protocol version: " + version);
        }

        var typeCode = Byte.toUnsignedInt(buffer.get());
        var flags = Short.toUnsignedInt(buffer.getShort());
        var cipherSuite = readCipherSuite(buffer);
        var conversationId = new UUID(buffer.getLong(), buffer.getLong());
        var sequence = buffer.getLong();
        var payloadLength = Integer.toUnsignedLong(buffer.getInt());

        if (payloadLength > PxpProtocol.MAX_PAYLOAD_LENGTH) {
            throw new PxpException("Payload length out of range: " + payloadLength);
        }

        var header = new FrameHeader(version, FrameType.of(typeCode), flags, cipherSuite, conversationId, sequence, (int) payloadLength);

        if (header.type() == FrameType.UNKNOWN && header.critical()) {
            throw new PxpException("Unknown critical frame type: " + typeCode);
        }

        return header;
    }

    public void write(ByteBuffer buffer) {
        if (type == FrameType.UNKNOWN) {
            throw new PxpException("Cannot write frame of unknown type");
        }

        requireHeader(buffer);

        buffer.put((byte) version).put((byte) type.code()).putShort((short) flags).putShort((short) cipherSuite.code());
        buffer.putLong(conversationId.getMostSignificantBits()).putLong(conversationId.getLeastSignificantBits());
        buffer.putLong(sequence).putInt(payloadLength);
    }

    public boolean critical() {
        return (flags & FLAG_CRITICAL) != 0;
    }

    public boolean ackRequested() {
        return (flags & FLAG_ACK_REQUESTED) != 0;
    }

    private static CipherSuite readCipherSuite(ByteBuffer buffer) {
        var code = Short.toUnsignedInt(buffer.getShort());
        var cipherSuite = CipherSuite.of(code);

        if (cipherSuite == null) {
            throw new PxpException("Unsupported cipher suite: " + code);
        }

        return cipherSuite;
    }

    private static void requireHeader(ByteBuffer buffer) {
        if (buffer.order() != ByteOrder.BIG_ENDIAN) {
            throw new PxpException("PXP frames are big-endian");
        }

        if (buffer.remaining() < PxpProtocol.HEADER_SIZE) {
            throw new PxpException("Buffer too small for frame header: " + buffer.remaining());
        }
    }
}
