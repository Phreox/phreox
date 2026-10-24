package talk.phreox.space.auth;

/** Default until phreox-service tokens can be verified, so a misconfigured node never trusts anybody. */
public final class DenyAllAuthenticator implements Authenticator {

    @Override
    public String authenticate(String authorization) {
        return null;
    }
}
