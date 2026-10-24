package talk.phreox.api.pxp;

import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FrameTest {

    private static Frame frame(long sequence, String text) {
        var payload = text.getBytes(StandardCharsets.UTF_8);

        return new Frame(FrameHeader.of(FrameType.EVENT, 0, CipherSuite.TRANSPORT_ONLY, PxpProtocol.NO_CONVERSATION, sequence, payload.length), payload);
    }

    @Test
    void encodesAndDecodesFrame() {
        var frame = frame(7, "hallo");
        var decoded = Frame.decode(frame.encode());

        assertEquals(frame.header(), decoded.header());
        assertArrayEquals(frame.payload(), decoded.payload());
    }

    @Test
    void decodesOnlyOneFrameFromBuffer() {
        var first = frame(1, "a").encode();
        var second = frame(2, "bb").encode();
        var buffer = ByteBuffer.allocate(first.remaining() + second.remaining()).put(first).put(second).flip();

        assertEquals(1, Frame.decode(buffer).header().sequence());
        assertEquals(2, Frame.decode(buffer).header().sequence());
        assertEquals(0, buffer.remaining());
    }

    @Test
    void rejectsTruncatedPayload() {
        var encoded = frame(1, "hallo").encode();
        var truncated = ByteBuffer.wrap(encoded.array(), 0, encoded.limit() - 1);

        assertThrows(PxpException.class, () -> Frame.decode(truncated));
    }

    @Test
    void rejectsMismatchingPayloadLength() {
        var header = FrameHeader.of(FrameType.EVENT, 0, CipherSuite.TRANSPORT_ONLY, PxpProtocol.NO_CONVERSATION, 1, 3);

        assertThrows(PxpException.class, () -> new Frame(header, new byte[2]));
    }

    @Test
    void replayGuardRejectsRepeatedAndOlderSequences() {
        var guard = new ReplayGuard();

        guard.accept(frame(1, "a").header());
        guard.accept(frame(5, "a").header());

        assertThrows(PxpException.class, () -> guard.accept(frame(5, "a").header()));
        assertThrows(PxpException.class, () -> guard.accept(frame(3, "a").header()));
    }
}
