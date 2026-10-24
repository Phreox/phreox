package talk.phreox.api.pxp;

import java.nio.ByteBuffer;

public record Frame(FrameHeader header, byte[] payload) {

    public Frame {
        if (header == null || payload == null) {
            throw new PxpException("Frame is incomplete");
        }

        if (header.payloadLength() != payload.length) {
            throw new PxpException("Payload length " + header.payloadLength() + " does not match payload of " + payload.length + " bytes");
        }

        payload = payload.clone();
    }

    @Override
    public byte[] payload() {
        return payload.clone();
    }

    public ByteBuffer encode() {
        var buffer = ByteBuffer.allocate(PxpProtocol.HEADER_SIZE + payload.length);

        header.write(buffer);
        buffer.put(payload);

        return buffer.flip();
    }

    /** Reads exactly one frame and leaves following bytes untouched. */
    public static Frame decode(ByteBuffer buffer) {
        var header = FrameHeader.read(buffer);

        if (buffer.remaining() < header.payloadLength()) {
            throw new PxpException("Incomplete frame: expected " + header.payloadLength() + " payload bytes, got " + buffer.remaining());
        }

        var payload = new byte[header.payloadLength()];
        buffer.get(payload);

        return new Frame(header, payload);
    }
}
