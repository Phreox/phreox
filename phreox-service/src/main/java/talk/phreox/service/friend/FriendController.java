package talk.phreox.service.friend;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.ApiException;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.service.auth.AccountService;

import java.util.List;
import java.util.UUID;

@Path("/friends")
public final class FriendController {

    private final AccountService accounts;
    private final FriendService friends;

    public FriendController(AccountService accounts, FriendService friends) {
        this.accounts = accounts;
        this.friends = friends;
    }

    @GET
    public List<ServiceApi.FriendView> list(@Header("Authorization") String authorization) {
        var me = accounts.authenticate(authorization);

        return friends.list(me.id()).stream()
                .flatMap(relation -> accounts.find(relation.accountId()).stream().map(account -> new ServiceApi.FriendView(account.id(), account.username(), relation.status())))
                .toList();
    }

    @POST
    @Path("/requests")
    public ServiceApi.FriendView request(@Header("Authorization") String authorization, @Body ServiceApi.FriendRequest request) {
        var me = accounts.authenticate(authorization);

        if (request == null) {
            throw new IllegalArgumentException("Request body is missing");
        }

        var target = accounts.findByUsername(request.username()).orElseThrow(() -> ApiException.notFound("User not found"));
        var status = friends.request(me.id(), target.id());

        return new ServiceApi.FriendView(target.id(), target.username(), status);
    }

    @POST
    @Path("/requests/{accountId}/accept")
    public ServiceApi.FriendView accept(@Header("Authorization") String authorization, @PathParam("accountId") UUID accountId) {
        var me = accounts.authenticate(authorization);
        var requester = accounts.find(accountId).orElseThrow(() -> ApiException.notFound("User not found"));

        friends.accept(me.id(), accountId);
        return new ServiceApi.FriendView(requester.id(), requester.username(), ServiceApi.FriendStatus.FRIENDS);
    }

    @POST
    @Path("/requests/{accountId}/decline")
    public void decline(@Header("Authorization") String authorization, @PathParam("accountId") UUID accountId) {
        friends.decline(accounts.authenticate(authorization).id(), accountId);
    }

    @DELETE
    @Path("/{accountId}")
    public void remove(@Header("Authorization") String authorization, @PathParam("accountId") UUID accountId) {
        friends.remove(accounts.authenticate(authorization).id(), accountId);
    }
}
