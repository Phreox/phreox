package talk.phreox.api.pxp;

/** One guard per connection and direction: the sequence must be strictly monotonic. */
public final class ReplayGuard {

    private long last = -1;

    public synchronized void accept(FrameHeader header) {
        if (header.sequence() <= last) {
            throw new PxpException("Replayed or reordered frame: sequence " + header.sequence() + " <= " + last);
        }

        last = header.sequence();
    }
}
