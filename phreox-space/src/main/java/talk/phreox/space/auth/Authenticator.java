package talk.phreox.space.auth;

import talk.phreox.api.http.ApiException;

public interface Authenticator {

    /** Maps the Authorization header to a user id, or null when the credentials are not valid. */
    String authenticate(String authorization);

    default String user(String authorization) {
        var user = authenticate(authorization);

        if (user == null) {
            throw ApiException.unauthorized("Authentication required");
        }

        return user;
    }
}
