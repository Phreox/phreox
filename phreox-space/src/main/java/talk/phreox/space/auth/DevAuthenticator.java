package talk.phreox.space.auth;

import java.util.regex.Pattern;

/** Development only: "Bearer dev:alice" is user alice. */
public final class DevAuthenticator implements Authenticator {

    private static final String PREFIX = "Bearer dev:";
    private static final Pattern USER = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    @Override
    public String authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith(PREFIX)) {
            return null;
        }

        var user = authorization.substring(PREFIX.length());

        return USER.matcher(user).matches() ? user : null;
    }
}
