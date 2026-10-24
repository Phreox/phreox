package talk.phreox.space.permission;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PermissionEngineTest {

    private static final Map<Permission, TriState> ALLOW_SEND = Map.of(Permission.SEND_MESSAGES, TriState.ALLOW);

    private static PermissionSubject subject(String... roles) {
        return new PermissionSubject("jason", false, java.util.Arrays.stream(roles).map(role -> new PermissionSubject.RoleRef(role, role)).toList());
    }

    private static PermissionScope scope(ScopeType type, String name, Target target, TriState state) {
        return new PermissionScope(type, name, name, Map.of(target, Map.of(Permission.SEND_MESSAGES, state)));
    }

    private static PermissionScope empty(ScopeType type, String name) {
        return new PermissionScope(type, name, name, Map.of());
    }

    @Test
    void deniesWithoutAnyRule() {
        var result = PermissionEngine.evaluate(Map.of(), List.of(empty(ScopeType.SPACE, "Space")), subject(), Permission.SEND_MESSAGES);

        assertFalse(result.allowed());
    }

    @Test
    void mutedRoleOverridesSpaceDefault() {
        var muted = scope(ScopeType.SPACE, "Space", new Target(TargetType.ROLE, "Muted"), TriState.DENY);
        var channel = empty(ScopeType.CHANNEL, "general");

        var result = PermissionEngine.evaluate(ALLOW_SEND, List.of(muted, channel), subject("Muted"), Permission.SEND_MESSAGES);

        assertFalse(result.allowed());
        assertEquals(List.of("Space Default", "Space · Role Muted", "Channel general Override"), result.steps().stream().map(Explanation.Step::source).toList());
        assertTrue(result.text().contains("Final Result: DENY"));
    }

    @Test
    void narrowerScopeOverridesBroaderOne() {
        var space = scope(ScopeType.SPACE, "Space", new Target(TargetType.ROLE, "Muted"), TriState.DENY);
        var channel = scope(ScopeType.CHANNEL, "announcements", new Target(TargetType.ROLE, "Muted"), TriState.ALLOW);

        assertTrue(PermissionEngine.evaluate(ALLOW_SEND, List.of(space, channel), subject("Muted"), Permission.SEND_MESSAGES).allowed());
    }

    @Test
    void denyBeatsAllowBetweenRolesOfOneScope() {
        var overrides = Map.of(
                new Target(TargetType.ROLE, "Helper"), Map.of(Permission.SEND_MESSAGES, TriState.ALLOW),
                new Target(TargetType.ROLE, "Muted"), Map.of(Permission.SEND_MESSAGES, TriState.DENY));
        var space = new PermissionScope(ScopeType.SPACE, "s", "Space", overrides);

        assertFalse(PermissionEngine.evaluate(ALLOW_SEND, List.of(space), subject("Helper", "Muted"), Permission.SEND_MESSAGES).allowed());
    }

    @Test
    void userOverrideBeatsRoleOverrideOfSameScope() {
        var overrides = Map.of(
                new Target(TargetType.ROLE, "Muted"), Map.of(Permission.SEND_MESSAGES, TriState.DENY),
                new Target(TargetType.USER, "jason"), Map.of(Permission.SEND_MESSAGES, TriState.ALLOW));
        var channel = new PermissionScope(ScopeType.CHANNEL, "c", "general", overrides);

        assertTrue(PermissionEngine.evaluate(ALLOW_SEND, List.of(channel), subject("Muted"), Permission.SEND_MESSAGES).allowed());
    }

    @Test
    void inheritKeepsEarlierResult() {
        var channel = scope(ScopeType.CHANNEL, "general", new Target(TargetType.ROLE, "Member"), TriState.INHERIT);

        assertTrue(PermissionEngine.evaluate(ALLOW_SEND, List.of(channel), subject("Member"), Permission.SEND_MESSAGES).allowed());
    }

    @Test
    void ownerIsAlwaysAllowed() {
        var owner = new PermissionSubject("jason", true, List.of());

        assertTrue(PermissionEngine.evaluate(Map.of(), List.of(), owner, Permission.BAN_MEMBERS).allowed());
    }

    @Test
    void distributesPowerLikeTheConcept() {
        assertArrayEquals(new short[] {32767, 26214, 19660, 13107, 6553, 0}, PowerDistribution.distribute(6));
        assertArrayEquals(new short[] {32767}, PowerDistribution.distribute(1));
        assertArrayEquals(new short[] {32767, 0}, PowerDistribution.distribute(2));
    }

    @Test
    void requiredPowerIsOneAboveTheRoleAndCapped() {
        assertEquals(1, PowerDistribution.requiredFor((short) 0));
        assertEquals(Short.MAX_VALUE, PowerDistribution.requiredFor(Short.MAX_VALUE));
    }

    @Test
    void manualPowerMustStayInRange() {
        assertThrows(IllegalArgumentException.class, () -> PowerSetting.manual(-1));
        assertThrows(IllegalArgumentException.class, () -> PowerSetting.manual(32768));
        assertEquals(500, PowerSetting.manual(500).manual());
    }

    @Test
    void joinPowerExample() {
        var check = PowerEngine.check(PowerType.JOIN, false, List.of(new PowerCheck.Contribution("Admin Role", 1000)), 800);

        assertTrue(check.allowed());
    }

    @Test
    void kickPowerExample() {
        var check = PowerEngine.check(PowerType.KICK, false, List.of(new PowerCheck.Contribution("Moderator Role", 500)), 700);

        assertFalse(check.allowed());
    }

    @Test
    void effectivePowerIsTheHighestRoleAndExplained() {
        var check = PowerEngine.check(PowerType.JOIN, false, List.of(new PowerCheck.Contribution("Helper Role", 1000), new PowerCheck.Contribution("Moderator Role", 2500)), 5000);

        assertEquals(2500, check.effective());
        assertTrue(check.text().contains("Required Join Power: 5000"));
        assertTrue(check.text().contains("2500 < 5000"));
        assertTrue(check.text().endsWith("Result: DENIED"));
    }

    @Test
    void ownerHasMaximumPower() {
        var check = PowerEngine.check(PowerType.BAN, true, List.of(), PowerDistribution.MAX);

        assertTrue(check.allowed());
    }
}
