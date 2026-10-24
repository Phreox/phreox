package talk.phreox.space.guild;

public record AuditEntry(long id, String action, String actorId, String targetId, String detail, long timestamp) {
}
