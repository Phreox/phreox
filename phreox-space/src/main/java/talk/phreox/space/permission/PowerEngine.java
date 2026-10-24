package talk.phreox.space.permission;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class PowerEngine {

    private PowerEngine() {
    }

    /** The effective power is the highest power of any role. The owner always has the maximum. */
    public static PowerCheck check(PowerType type, boolean owner, List<PowerCheck.Contribution> roles, int required) {
        var contributions = new ArrayList<>(roles);

        if (owner) {
            contributions.add(new PowerCheck.Contribution("Space Owner", PowerDistribution.MAX));
        }

        var effective = contributions.stream().mapToInt(PowerCheck.Contribution::value).max().orElse(0);
        contributions.sort(Comparator.comparingInt(PowerCheck.Contribution::value).reversed());

        return new PowerCheck(type, effective, required, effective >= required, contributions);
    }
}
