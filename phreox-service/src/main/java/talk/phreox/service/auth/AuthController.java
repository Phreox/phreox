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

    public AuthController(AccountService accounts) {
        this.accounts = accounts;
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

    @GET
    @Path("/me")
    public ServiceApi.AccountView me(@Header("Authorization") String authorization) {
        return AccountService.view(accounts.authenticate(authorization));
    }
}
