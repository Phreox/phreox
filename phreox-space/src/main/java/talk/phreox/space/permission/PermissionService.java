package talk.phreox.space.permission;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.space.guild.Input;
import talk.phreox.space.guild.Space;
import talk.phreox.space.guild.SpaceAccess;
import talk.phreox.space.guild.Views;

public final class PermissionService {

    private final SpaceAccess access;

    public PermissionService(SpaceAccess access) {
        this.access = access;
    }

    public void setOverride(String userId, String spaceId, SpaceApi.SetOverrideRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            Input.body(request);

            var scope = Input.enumValue(ScopeType.class, request.scopeType(), "scopeType");
            var targetType = Input.enumValue(TargetType.class, request.targetType(), "targetType");
            var permission = Views.permission(request.permission());
            var state = Input.enumValue(TriState.class, request.state(), "state");
            var scopeId = scope == ScopeType.SPACE && request.scopeId() == null ? spaceId : request.scopeId();

            if (scopeId == null || !space.scopeExists(scope, scopeId)) {
                throw ApiException.badRequest("Unknown scope");
            }

            if (request.targetId() == null || request.targetId().isBlank()) {
                throw ApiException.badRequest("Missing targetId");
            }

            access.require(space, userId, scope == ScopeType.SPACE ? Permission.MANAGE_ROLES : Permission.MANAGE_CHANNELS, null);

            if (targetType == TargetType.ROLE) {
                var role = space.role(request.targetId()).orElseThrow(() -> ApiException.notFound("Role not found"));

                access.requireAbove(space, userId, role);
            } else {
                access.requirePowerOn(space, userId, request.targetId(), PowerType.MODIFY);
            }

            // Nobody can hand out what they lack themselves.
            if (state == TriState.ALLOW && !space.owner(userId) && !access.can(space, userId, permission, scope == ScopeType.CHANNEL ? access.channelOf(space, scopeId) : null)) {
                throw ApiException.forbidden("Cannot grant a permission you do not have");
            }

            space.override(scope, scopeId, new Target(targetType, request.targetId()), permission, state);
            space.audit("permission.override", userId, request.targetId(), scope + " " + scopeId + " " + permission + " " + state);
        }
    }

    public SpaceApi.PermissionExplainResponse explainPermission(String userId, String spaceId, String permissionName, String channelId, String subjectId) {
        var space = access.memberSpace(spaceId, userId);
        var subject = subject(space, userId, subjectId);
        var channel = channelId == null ? null : access.channelOf(space, channelId);
        var explanation = access.explain(space, subject, Views.permission(permissionName), channel);
        var steps = explanation.steps().stream().map(step -> new SpaceApi.ExplainStep(step.source(), step.state().name(), step.allowed())).toList();

        return new SpaceApi.PermissionExplainResponse(explanation.permission().name(), subject, explanation.allowed(), steps, explanation.text());
    }

    /** Join power is checked against the channel, the other types against the target member. */
    public SpaceApi.PowerExplainResponse explainPower(String userId, String spaceId, String typeName, String channelId, String targetId, String subjectId) {
        var space = access.memberSpace(spaceId, userId);
        var subject = subject(space, userId, subjectId);
        var type = Input.enumValue(PowerType.class, typeName, "type");
        var required = requiredPower(space, type, channelId, targetId);
        var check = access.powerCheck(space, subject, type, required);
        var contributions = check.contributions().stream().map(each -> new SpaceApi.PowerContribution(each.source(), each.value())).toList();

        return new SpaceApi.PowerExplainResponse(type.name(), subject, check.required(), check.effective(), check.allowed(), contributions, check.text());
    }

    private int requiredPower(Space space, PowerType type, String channelId, String targetId) {
        if (channelId != null) {
            return access.channelOf(space, channelId).requiredJoinPower();
        }

        if (targetId != null) {
            return access.requiredPowerOn(space, targetId, type);
        }

        throw ApiException.badRequest("Either channelId or targetId is required");
    }

    private String subject(Space space, String userId, String subjectId) {
        if (subjectId == null || subjectId.equals(userId)) {
            return userId;
        }

        access.require(space, userId, Permission.MANAGE_ROLES, null);
        return subjectId;
    }
}
