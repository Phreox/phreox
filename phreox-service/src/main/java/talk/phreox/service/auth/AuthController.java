package talk.phreox.service.auth;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.Header;

@Path("/auth")
public final class AuthController {

    private final AccountService accounts;
    private final SpaceTokenService spaceTokens;

    public AuthController(AccountService accounts, SpaceTokenService spaceTokens) {
        this.accounts = accounts;
        this.spaceTokens = spaceTokens;
    }

    @POST
    @Path("/register")
    public ServiceApi.AccountView register(@Body ServiceApi.RegisterRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is missing");
        }

        return AccountService.view(accounts.register(request.username(), request.password()));
    }

    @POST
    @Path("/login")
    public ServiceApi.SessionResponse login(@Body ServiceApi.LoginRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is missing");
        }

        return accounts.login(request.username(), request.password());
    }

    @POST
    @Path("/logout")
    public void logout(@Header("Authorization") String authorization) {
        accounts.logout(authorization);
    }

    /** Exchanges the session for a token that is only valid on one registered space node. */
    @POST
    @Path("/space-token")
    public ServiceApi.SpaceTokenResponse spaceToken(@Header("Authorization") String authorization, @Body ServiceApi.SpaceTokenRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is missing");
        }

        return spaceTokens.issue(accounts.authenticate(authorization), request.audience());
    }

    @GET
    @Path("/me")
    public ServiceApi.AccountView me(@Header("Authorization") String authorization) {
        return AccountService.view(accounts.authenticate(authorization));
    }
}
