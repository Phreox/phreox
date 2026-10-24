package talk.phreox.space.permission;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Starts denied, applies the space default and then walks the scopes from broad to narrow.
 * Per scope the role overrides apply first (DENY beats ALLOW between roles), the user override last.
 * INHERIT keeps the result of the previous step. The space owner is always allowed.
 */
public final class PermissionEngine {

    private PermissionEngine() {
    }

    public static Explanation evaluate(Map<Permission, TriState> defaults, List<PermissionScope> scopes, PermissionSubject subject, Permission permission) {
        var steps = new ArrayList<Explanation.Step>();

        if (subject.owner()) {
            steps.add(new Explanation.Step("Space Owner", TriState.ALLOW, true));
            return new Explanation(permission, true, steps);
        }

        var base = defaults.getOrDefault(permission, TriState.INHERIT);
        var allowed = apply(false, base);
        steps.add(new Explanation.Step("Space Default", base, allowed));

        for (var scope : scopes) {
            allowed = evaluateScope(scope, subject, permission, allowed, steps);
        }

        return new Explanation(permission, allowed, steps);
    }

    private static boolean evaluateScope(PermissionScope scope, PermissionSubject subject, Permission permission, boolean allowed, List<Explanation.Step> steps) {
        var roleDecision = TriState.INHERIT;
        var contributing = new ArrayList<Map.Entry<String, TriState>>();

        for (var role : subject.roles()) {
            var state = scope.state(new Target(TargetType.ROLE, role.id()), permission);

            if (state == TriState.INHERIT) {
                continue;
            }

            contributing.add(Map.entry(role.name(), state));

            if (state == TriState.DENY) {
                roleDecision = TriState.DENY;
            } else if (roleDecision == TriState.INHERIT) {
                roleDecision = TriState.ALLOW;
            }
        }

        var result = apply(allowed, roleDecision);

        for (var entry : contributing) {
            steps.add(new Explanation.Step(scope.label() + " · Role " + entry.getKey(), entry.getValue(), result));
        }

        var userState = scope.state(new Target(TargetType.USER, subject.userId()), permission);
        result = apply(result, userState);

        if (userState != TriState.INHERIT) {
            steps.add(new Explanation.Step(scope.label() + " · User Override", userState, result));
        }

        if (contributing.isEmpty() && userState == TriState.INHERIT) {
            steps.add(new Explanation.Step(scope.label() + " Override", TriState.INHERIT, result));
        }

        return result;
    }

    private static boolean apply(boolean current, TriState state) {
        return switch (state) {
            case ALLOW -> true;
            case DENY -> false;
            case INHERIT -> current;
        };
    }
}
