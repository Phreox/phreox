package talk.phreox.space.permission;

import java.util.List;

public record Explanation(Permission permission, boolean allowed, List<Step> steps) {

    /** One rule that took part in the decision; allowed is the running result after the step. */
    public record Step(String source, TriState state, boolean allowed) {
    }

    public Explanation {
        steps = List.copyOf(steps);
    }

    public String text() {
        var text = new StringBuilder(permission.label()).append(": ").append(allowed ? "ALLOWED" : "DENIED").append("\n\n");

        for (var step : steps) {
            text.append(String.format("%-44s %s%n", step.source(), step.state()));
        }

        return text.append("\nFinal Result: ").append(allowed ? "ALLOW" : "DENY").toString();
    }
}
