package talk.phreox.space.guild;

import talk.phreox.space.permission.PowerDistribution;
import talk.phreox.space.permission.PowerMode;
import talk.phreox.space.permission.PowerSetting;
import talk.phreox.space.permission.PowerType;

import java.util.EnumMap;
import java.util.Map;

public final class Role {

    private final String id;
    private final Map<PowerType, PowerSetting> power = new EnumMap<>(PowerType.class);
    private final Map<PowerType, PowerSetting> required = new EnumMap<>(PowerType.class);

    private String name;
    private short autoPower;

    Role(String id, String name) {
        this.id = id;
        this.name = name;

        for (var type : PowerType.values()) {
            power.put(type, PowerSetting.auto());
            required.put(type, PowerSetting.auto());
        }
    }

    public String id() {
        return id;
    }

    public String name() {
        return name;
    }

    public void name(String name) {
        this.name = name;
    }

    /** Power this role gives its holders. */
    public short power(PowerType type) {
        return resolve(power.get(type), autoPower);
    }

    /** Power needed to act on holders of this role. */
    public short required(PowerType type) {
        return resolve(required.get(type), PowerDistribution.requiredFor(autoPower));
    }

    public PowerSetting powerSetting(PowerType type) {
        return power.get(type);
    }

    public PowerSetting requiredSetting(PowerType type) {
        return required.get(type);
    }

    public void power(PowerType type, PowerSetting setting) {
        power.put(type, setting);
    }

    public void required(PowerType type, PowerSetting setting) {
        required.put(type, setting);
    }

    void autoPower(short autoPower) {
        this.autoPower = autoPower;
    }

    private static short resolve(PowerSetting setting, short auto) {
        return setting.mode() == PowerMode.AUTO ? auto : setting.manual();
    }
}
