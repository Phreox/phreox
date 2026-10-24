package talk.phreox.space.permission;

public final class PowerDistribution {

    public static final short MAX = Short.MAX_VALUE;

    private PowerDistribution() {
    }

    /** Spreads power evenly over the role order, index 0 is the top role and gets MAX, the last role gets 0. */
    public static short[] distribute(int roles) {
        var values = new short[roles];

        if (roles == 1) {
            values[0] = MAX;
            return values;
        }

        for (var i = 0; i < roles; i++) {
            values[i] = (short) Math.round((double) MAX * (roles - 1 - i) / (roles - 1));
        }

        return values;
    }

    /** What it takes to act on a holder of a role with the given power: strictly more than the role itself. */
    public static short requiredFor(short power) {
        return (short) Math.min(power + 1, MAX);
    }
}
