package talk.phreox.space.permission;

import java.util.List;

public record PowerCheck(PowerType type, int effective, int required, boolean allowed, List<Contribution> contributions) {

    public record Contribution(String source, int value) {
    }

    public PowerCheck {
        contributions = List.copyOf(contributions);
    }

    public String text() {
        var text = new StringBuilder();
        var name = type.name().charAt(0) + type.name().substring(1).toLowerCase();

        text.append("Required ").append(name).append(" Power: ").append(required).append('\n');
        text.append("Your Effective Power: ").append(effective).append("\n\n");

        for (var contribution : contributions) {
            text.append(contribution.source()).append(": ").append(contribution.value()).append('\n');
        }

        return text.append('\n').append(effective).append(allowed ? " >= " : " < ").append(required)
                .append("\n\nResult: ").append(allowed ? "ALLOWED" : "DENIED").toString();
    }
}
