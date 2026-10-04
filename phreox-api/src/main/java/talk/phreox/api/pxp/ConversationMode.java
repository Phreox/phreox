package talk.phreox.api.pxp;

public enum ConversationMode {
    /** Server-readable over TLS/QUIC: full history, search and moderation. */
    PUBLIC,
    /** MLS end-to-end encrypted: DMs, groups and private channels. */
    PRIVATE
}
