package talk.phreox.service.entitlement;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.PUT;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.service.auth.AccountService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@Path("/entitlements")
public final class EntitlementController {

    private final AccountService accounts;
    private final EntitlementService entitlements;
    private final byte[] adminToken;

    /** Without an admin token, granting is disabled. */
    public EntitlementController(AccountService accounts, EntitlementService entitlements, String adminToken) {
        this.accounts = accounts;
        this.entitlements = entitlements;
        this.adminToken = adminToken == null ? null : adminToken.getBytes(StandardCharsets.UTF_8);
    }

    @GET
    @Path("/me")
    public ServiceApi.Entitlement mine(@Header("Authorization") String authorization) {
        return entitlements.issue(accounts.authenticate(authorization).id());
    }

    @POST
    @Path("/verify")
    public ServiceApi.VerifyResponse verify(@Body ServiceApi.Entitlement entitlement) {
        return entitlements.verify(entitlement);
    }

    @PUT
    @Path("/{accountId}")
    public ServiceApi.Entitlement grant(@Header("X-Phreox-Admin-Token") String token, @PathParam("accountId") UUID accountId, @Body ServiceApi.GrantEntitlementRequest request) {
        if (adminToken == null) {
            throw ApiException.forbidden("Granting entitlements is disabled");
        }

        if (token == null || !MessageDigest.isEqual(adminToken, token.getBytes(StandardCharsets.UTF_8))) {
            throw ApiException.unauthorized("Invalid admin token");
        }

        accounts.find(accountId).orElseThrow(() -> ApiException.notFound("User not found"));
        entitlements.grant(accountId, request);

        return entitlements.issue(accountId);
    }
}
