package talk.phreox.service;

import org.junit.jupiter.api.Test;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.auth.AccountService;
import talk.phreox.service.auth.LoginThrottle;
import talk.phreox.service.crypto.PasswordHasher;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AccountServiceTest {

    private static final String PASSWORD = "correct horse battery";

    private final MutableClock clock = new MutableClock();
    private final AccountService accounts = new AccountService(new PasswordHasher(1000), new LoginThrottle(clock), clock);

    @Test
    void registersLogsInAndAuthenticates() {
        var account = accounts.register("Alice", PASSWORD);
        var session = accounts.login("alice", PASSWORD);

        assertEquals("alice", account.username());
        assertEquals(account, accounts.authenticate("Bearer " + session.token()));
        assertFalse(account.passwordHash().contains(PASSWORD));
        assertFalse(account.toString().contains(account.passwordHash()));
    }

    @Test
    void rejectsDuplicateAndInvalidRegistration() {
        accounts.register("alice", PASSWORD);

        assertThrows(ApiException.class, () -> accounts.register("ALICE", PASSWORD));
        assertThrows(IllegalArgumentException.class, () -> accounts.register("a", PASSWORD));
        assertThrows(IllegalArgumentException.class, () -> accounts.register("bad name", PASSWORD));
        assertThrows(IllegalArgumentException.class, () -> accounts.register("bob", "short"));
    }

    @Test
    void rejectsWrongCredentialsWithSameError() {
        accounts.register("alice", PASSWORD);

        var wrongPassword = assertThrows(ApiException.class, () -> accounts.login("alice", "wrong password!"));
        var unknownUser = assertThrows(ApiException.class, () -> accounts.login("nobody", PASSWORD));

        assertEquals(401, wrongPassword.status());
        assertEquals(wrongPassword.getMessage(), unknownUser.getMessage());
    }

    @Test
    void locksAfterRepeatedFailuresAndRecovers() {
        accounts.register("alice", PASSWORD);

        for (var i = 0; i < 5; i++) {
            assertThrows(ApiException.class, () -> accounts.login("alice", "wrong password!"));
        }

        assertEquals(403, assertThrows(ApiException.class, () -> accounts.login("alice", PASSWORD)).status());

        clock.advance(Duration.ofMinutes(2));

        accounts.login("alice", PASSWORD);
    }

    @Test
    void sessionsExpireAndLogoutInvalidates() {
        accounts.register("alice", PASSWORD);

        var first = accounts.login("alice", PASSWORD);
        var second = accounts.login("alice", PASSWORD);

        assertNotEquals(first.token(), second.token());

        accounts.logout("Bearer " + first.token());

        assertThrows(ApiException.class, () -> accounts.authenticate("Bearer " + first.token()));

        clock.advance(Duration.ofDays(8));

        assertThrows(ApiException.class, () -> accounts.authenticate("Bearer " + second.token()));
        assertThrows(ApiException.class, () -> accounts.authenticate(null));
        assertThrows(ApiException.class, () -> accounts.authenticate("Bearer "));
        assertThrows(ApiException.class, () -> accounts.authenticate("Basic abc"));
    }
}
