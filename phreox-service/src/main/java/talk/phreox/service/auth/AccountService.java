package talk.phreox.service.auth;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.crypto.PasswordHasher;
import talk.phreox.service.crypto.Tokens;

import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

public final class AccountService {

    private static final Pattern USERNAME = Pattern.compile("[a-z0-9_.-]{3,32}");
    private static final String BEARER_PREFIX = "Bearer ";
    private static final int MIN_PASSWORD_LENGTH = 10;
    private static final int MAX_PASSWORD_LENGTH = 128;
    private static final Duration SESSION_TTL = Duration.ofDays(7);

    private record Session(UUID accountId, long expiresAt) {
    }

    private final Map<UUID, Account> accounts = new ConcurrentHashMap<>();
    private final Map<String, UUID> usernames = new ConcurrentHashMap<>();
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final PasswordHasher hasher;
    private final LoginThrottle throttle;
    private final Clock clock;
    private final String dummyHash;

    public AccountService(PasswordHasher hasher, LoginThrottle throttle, Clock clock) {
        this.hasher = hasher;
        this.throttle = throttle;
        this.clock = clock;
        this.dummyHash = hasher.hash(Tokens.create());
    }

    public Account register(String username, String password) {
        var name = normalize(username);

        if (password == null || password.length() < MIN_PASSWORD_LENGTH || password.length() > MAX_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Password must have " + MIN_PASSWORD_LENGTH + " to " + MAX_PASSWORD_LENGTH + " characters");
        }

        var account = new Account(UUID.randomUUID(), name, hasher.hash(password), clock.millis());

        if (usernames.putIfAbsent(name, account.id()) != null) {
            throw ApiException.conflict("Username is taken");
        }

        accounts.put(account.id(), account);
        return account;
    }

    public ServiceApi.SessionResponse login(String username, String password) {
        var name = username == null ? "" : username.strip().toLowerCase(Locale.ROOT);

        throttle.check(name);

        var id = usernames.get(name);
        var account = id == null ? null : accounts.get(id);
        var candidate = password == null || password.length() > MAX_PASSWORD_LENGTH ? "" : password;

        // Hash against a dummy for unknown users, so response time does not reveal which usernames exist.
        var valid = hasher.matches(candidate, account == null ? dummyHash : account.passwordHash());

        if (account == null || !valid) {
            throttle.failure(name);
            throw ApiException.unauthorized("Invalid credentials");
        }

        throttle.success(name);

        var token = Tokens.create();
        var expiresAt = clock.millis() + SESSION_TTL.toMillis();

        sessions.put(Tokens.hash(token), new Session(account.id(), expiresAt));
        return new ServiceApi.SessionResponse(token, account.id(), account.username(), expiresAt);
    }

    public void logout(String authorization) {
        authenticate(authorization);
        sessions.remove(Tokens.hash(token(authorization)));
    }

    public Account authenticate(String authorization) {
        var token = token(authorization);
        var key = Tokens.hash(token);
        var session = sessions.get(key);

        if (session == null) {
            throw ApiException.unauthorized("Invalid session");
        }

        if (session.expiresAt() <= clock.millis()) {
            sessions.remove(key);
            throw ApiException.unauthorized("Session expired");
        }

        var account = accounts.get(session.accountId());

        if (account == null) {
            throw ApiException.unauthorized("Invalid session");
        }

        return account;
    }

    public Optional<Account> find(UUID id) {
        return Optional.ofNullable(accounts.get(id));
    }

    public Optional<Account> findByUsername(String username) {
        if (username == null) {
            return Optional.empty();
        }

        var id = usernames.get(username.strip().toLowerCase(Locale.ROOT));
        return id == null ? Optional.empty() : find(id);
    }

    public static ServiceApi.AccountView view(Account account) {
        return new ServiceApi.AccountView(account.id(), account.username());
    }

    private static String token(String authorization) {
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX) || authorization.length() == BEARER_PREFIX.length()) {
            throw ApiException.unauthorized("Authentication required");
        }

        return authorization.substring(BEARER_PREFIX.length());
    }

    private static String normalize(String username) {
        var name = username == null ? "" : username.strip().toLowerCase(Locale.ROOT);

        if (!USERNAME.matcher(name).matches()) {
            throw new IllegalArgumentException("Username must have 3 to 32 characters of a-z, 0-9, '_', '.' or '-'");
        }

        return name;
    }
}
