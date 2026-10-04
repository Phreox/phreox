package talk.phreox.api.pxp;

import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FrameHeaderTest {

    private static final UUID CONVERSATION = UUID.fromString("0f8e2a7c-3b5d-4e61-9a2f-7c1d0b4e8a93");

    @Test
    void writesAndReadsSameHeader() {
        var header = FrameHeader.of(FrameType.MLS_APPLICATION, FrameHeader.FLAG_ACK_REQUESTED, CipherSuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_ED25519, CONVERSATION, 42, 1024);
        var buffer = ByteBuffer.allocate(PxpProtocol.HEADER_SIZE);

        header.write(buffer);

        assertEquals(0, buffer.remaining());
        assertEquals(header, FrameHeader.read(buffer.flip()));
    }

    @Test
    void writesBigEndianLayout() {
        var header = FrameHeader.of(FrameType.EVENT, FrameHeader.FLAG_CRITICAL, CipherSuite.TRANSPORT_ONLY, PxpProtocol.NO_CONVERSATION, 1, 5);
        var buffer = ByteBuffer.allocate(PxpProtocol.HEADER_SIZE);

        header.write(buffer);

        var bytes = buffer.array();
        assertEquals(1, bytes[0]);
        assertEquals(0x20, bytes[1]);
        assertEquals(1, bytes[3]);
        assertEquals(1, bytes[29]);
        assertEquals(5, bytes[33]);
    }

    @Test
    void rejectsUnsupportedVersion() {
        var buffer = encoded(FrameType.PING, 0);

        buffer.put(0, (byte) 2);

        assertThrows(PxpException.class, () -> FrameHeader.read(buffer));
    }

    @Test
    void skipsUnknownNonCriticalType() {
        var buffer = encoded(FrameType.PING, 0);

        buffer.put(1, (byte) 0xEE);

        assertEquals(FrameType.UNKNOWN, FrameHeader.read(buffer).type());
    }

    @Test
    void rejectsUnknownCriticalType() {
        var buffer = encoded(FrameType.PING, FrameHeader.FLAG_CRITICAL);

        buffer.put(1, (byte) 0xEE);

        assertThrows(PxpException.class, () -> FrameHeader.read(buffer));
    }

    @Test
    void rejectsUnknownFlags() {
        var buffer = encoded(FrameType.PING, 0);

        buffer.putShort(2, (short) 0x8000);

        assertThrows(PxpException.class, () -> FrameHeader.read(buffer));
    }

    @Test
    void rejectsUnknownCipherSuite() {
        var buffer = encoded(FrameType.PING, 0);

        buffer.putShort(4, (short) 0x7777);

        assertThrows(PxpException.class, () -> FrameHeader.read(buffer));
    }

    @Test
    void rejectsOversizedPayload() {
        var buffer = encoded(FrameType.PING, 0);

        buffer.putInt(30, -1);

        assertThrows(PxpException.class, () -> FrameHeader.read(buffer));
    }

    @Test
    void rejectsTruncatedHeader() {
        var buffer = ByteBuffer.allocate(PxpProtocol.HEADER_SIZE - 1);

        assertThrows(PxpException.class, () -> FrameHeader.read(buffer));
    }

    @Test
    void rejectsLittleEndianBuffer() {
        var buffer = encoded(FrameType.PING, 0).order(ByteOrder.LITTLE_ENDIAN);

        assertThrows(PxpException.class, () -> FrameHeader.read(buffer));
    }

    @Test
    void refusesToWriteUnknownType() {
        var header = FrameHeader.of(FrameType.UNKNOWN, 0, CipherSuite.TRANSPORT_ONLY, PxpProtocol.NO_CONVERSATION, 0, 0);

        assertThrows(PxpException.class, () -> header.write(ByteBuffer.allocate(PxpProtocol.HEADER_SIZE)));
    }

    private ByteBuffer encoded(FrameType type, int flags) {
        var buffer = ByteBuffer.allocate(PxpProtocol.HEADER_SIZE);

        FrameHeader.of(type, flags, CipherSuite.TRANSPORT_ONLY, CONVERSATION, 7, 0).write(buffer);
        return buffer.flip();
    }
}
