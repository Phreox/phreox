package talk.phreox.space.permission;

public enum Permission {
    VIEW_CHANNEL("View Channels"),
    SEND_MESSAGES("Send Messages"),
    ADD_REACTIONS("Add Reactions"),
    MANAGE_MESSAGES("Manage Messages"),
    JOIN_VOICE("Join Voice"),
    SPEAK("Speak"),
    CREATE_INVITE("Create Invites"),
    KICK_MEMBERS("Kick Members"),
    BAN_MEMBERS("Ban Members"),
    MUTE_MEMBERS("Mute Members"),
    MOVE_MEMBERS("Move Members"),
    MANAGE_CHANNELS("Manage Channels"),
    MANAGE_ROLES("Manage Roles"),
    VIEW_AUDIT_LOG("View Audit Log");

    private final String label;

    Permission(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
