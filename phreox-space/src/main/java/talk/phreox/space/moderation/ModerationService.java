package talk.phreox.space.moderation;

import talk.phreox.api.SpaceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.space.event.SpaceEvents;
import talk.phreox.space.guild.SpaceAccess;
import talk.phreox.space.guild.Views;
import talk.phreox.space.permission.Permission;
import talk.phreox.space.permission.PowerType;

import java.util.List;

public final class ModerationService {

    private static final long MAX_MUTE_SECONDS = 28L * 24 * 60 * 60;
    private static final int MAX_AUDIT_LIMIT = 200;

    private final SpaceAccess access;
    private final SpaceEvents events;

    public ModerationService(SpaceAccess access, SpaceEvents events) {
        this.access = access;
        this.events = events;
    }

    public void kick(String userId, String spaceId, String targetId) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.KICK_MEMBERS, null);
            requireOther(userId, targetId);
            access.member(space, targetId);
            access.requirePowerOn(space, userId, targetId, PowerType.KICK);

            space.removeMember(targetId);
            space.audit("member.kick", userId, targetId, null);
            events.publish(spaceId, "member.kick", null, targetId);
        }
    }

    public void ban(String userId, String spaceId, String targetId, SpaceApi.BanRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.BAN_MEMBERS, null);
            requireOther(userId, targetId);
            access.requirePowerOn(space, userId, targetId, PowerType.BAN);

            space.removeMember(targetId);
            space.ban(targetId);
            space.audit("member.ban", userId, targetId, request == null ? null : request.reason());
            events.publish(spaceId, "member.ban", null, targetId);
        }
    }

    public void unban(String userId, String spaceId, String targetId) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.BAN_MEMBERS, null);

            if (!space.unban(targetId)) {
                throw ApiException.notFound("User is not banned");
            }

            space.audit("member.unban", userId, targetId, null);
        }
    }

    /** A duration of 0 lifts the mute. Muted members stay in the space but cannot send messages. */
    public SpaceApi.MemberView mute(String userId, String spaceId, String targetId, SpaceApi.MuteRequest request) {
        var space = access.memberSpace(spaceId, userId);

        synchronized (space) {
            access.require(space, userId, Permission.MUTE_MEMBERS, null);
            requireOther(userId, targetId);

            var seconds = request == null ? 0 : request.durationSeconds();

            if (seconds < 0 || seconds > MAX_MUTE_SECONDS) {
                throw ApiException.badRequest("Duration must be between 0 and " + MAX_MUTE_SECONDS + " seconds");
            }

            var target = access.member(space, targetId);
            access.requirePowerOn(space, userId, targetId, PowerType.KICK);

            target.mutedUntil(seconds == 0 ? 0 : System.currentTimeMillis() + seconds * 1000);
            space.audit("member.mute", userId, targetId, seconds + "s");

            return Views.member(space, target);
        }
    }

    public List<SpaceApi.AuditEntryView> audit(String userId, String spaceId, int limit) {
        var space = access.memberSpace(spaceId, userId);

        access.require(space, userId, Permission.VIEW_AUDIT_LOG, null);

        return space.audit(limit <= 0 ? 50 : Math.min(limit, MAX_AUDIT_LIMIT)).stream().map(Views::audit).toList();
    }

    private void requireOther(String userId, String targetId) {
        if (userId.equals(targetId)) {
            throw ApiException.badRequest("You cannot moderate yourself");
        }
    }
}
