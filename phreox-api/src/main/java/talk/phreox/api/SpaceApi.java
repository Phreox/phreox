package talk.phreox.api;

import talk.phreox.api.pxp.ConversationMode;

import java.util.List;
import java.util.Map;

/** Types of the phreox-space HTTP API. Enums travel as their names. */
public final class SpaceApi {

    public record SpaceView(String id, String name, String ownerId, long createdAt) {
    }

    public record CategoryView(String id, String spaceId, String name) {
    }

    public record ChannelView(String id, String spaceId, String categoryId, String name, ConversationMode mode, int requiredJoinPower, long createdAt) {
    }

    public record MemberView(String userId, String spaceId, List<String> roleIds, long joinedAt, long mutedUntil) {
    }

    public record PowerView(int value, String mode) {
    }

    /** Rank 0 is the top role. Maps are keyed by permission or power type name. */
    public record RoleView(String id, String spaceId, String name, int rank, Map<String, String> permissions, Map<String, PowerView> powers, Map<String, PowerView> requiredPowers) {
    }

    public record InviteView(String code, String spaceId, int maxUses, int uses) {
    }

    public record ReactionView(String emoji, List<String> userIds) {
    }

    /** PUBLIC channels carry content, PRIVATE channels only an opaque ciphertext the server never reads. */
    public record MessageView(String id, String channelId, String authorId, String content, String ciphertext, long createdAt, long editedAt, List<ReactionView> reactions) {
    }

    public record MessagePage(List<MessageView> messages, boolean hasMore) {
    }

    public record AuditEntryView(long id, String action, String actorId, String targetId, String detail, long timestamp) {
    }

    public record SpaceEvent(long sequence, String spaceId, String type, long timestamp, String channelId, Object data) {
    }

    public record ExplainStep(String source, String state, boolean allowed) {
    }

    public record PermissionExplainResponse(String permission, String userId, boolean allowed, List<ExplainStep> steps, String text) {
    }

    public record PowerContribution(String source, int value) {
    }

    public record PowerExplainResponse(String type, String userId, int required, int effective, boolean allowed, List<PowerContribution> contributions, String text) {
    }

    public record CreateSpaceRequest(String name) {
    }

    /** A missing position appends the role at the bottom. */
    public record CreateRoleRequest(String name, Integer position) {
    }

    public record MoveRoleRequest(Integer position) {
    }

    /** kind is POWER or REQUIRED, mode is AUTO or MANUAL, value only counts for MANUAL. */
    public record SetPowerRequest(String type, String kind, String mode, int value) {
    }

    public record CreateCategoryRequest(String name) {
    }

    public record CreateChannelRequest(String name, String categoryId, String mode) {
    }

    public record SetValueRequest(int value) {
    }

    /** scopeType: SPACE, CATEGORY or CHANNEL. targetType: ROLE or USER. state: ALLOW, DENY or INHERIT. */
    public record SetOverrideRequest(String scopeType, String scopeId, String targetType, String targetId, String permission, String state) {
    }

    public record CreateInviteRequest(int maxUses) {
    }

    public record SendMessageRequest(String content, String ciphertext) {
    }

    public record EditMessageRequest(String content, String ciphertext) {
    }

    public record BanRequest(String reason) {
    }

    public record MuteRequest(long durationSeconds) {
    }

    private SpaceApi() {
    }
}
