package talk.phreox.space.permission;

public record PowerSetting(PowerMode mode, short manual) {

    public static PowerSetting auto() {
        return new PowerSetting(PowerMode.AUTO, (short) 0);
    }

    public static PowerSetting manual(int value) {
        if (value < 0 || value > PowerDistribution.MAX) {
            throw new IllegalArgumentException("Power must be between 0 and " + PowerDistribution.MAX);
        }

        return new PowerSetting(PowerMode.MANUAL, (short) value);
    }
}
