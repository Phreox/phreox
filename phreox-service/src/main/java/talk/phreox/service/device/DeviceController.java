package talk.phreox.service.device;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.ApiException;
import talk.phreox.service.auth.AccountService;
import talk.phreox.service.friend.FriendService;

import java.util.List;
import java.util.UUID;

@Path("/devices")
public final class DeviceController {

    private final AccountService accounts;
    private final DeviceService devices;
    private final FriendService friends;

    public DeviceController(AccountService accounts, DeviceService devices, FriendService friends) {
        this.accounts = accounts;
        this.devices = devices;
        this.friends = friends;
    }

    @POST
    public ServiceApi.DeviceView register(@Header("Authorization") String authorization, @Body ServiceApi.RegisterDeviceRequest request) {
        return devices.register(accounts.authenticate(authorization).id(), request);
    }

    @GET
    public List<ServiceApi.DeviceView> list(@Header("Authorization") String authorization) {
        return devices.list(accounts.authenticate(authorization).id());
    }

    @DELETE
    @Path("/{deviceId}")
    public void revoke(@Header("Authorization") String authorization, @PathParam("deviceId") UUID deviceId) {
        devices.revoke(accounts.authenticate(authorization).id(), deviceId);
    }

    @POST
    @Path("/{deviceId}/trust")
    public ServiceApi.DeviceView trust(@Header("Authorization") String authorization, @PathParam("deviceId") UUID deviceId, @Body ServiceApi.TrustDeviceRequest request) {
        return devices.trust(accounts.authenticate(authorization).id(), deviceId, request);
    }

    @POST
    @Path("/{deviceId}/key-packages")
    public void addKeyPackages(@Header("Authorization") String authorization, @PathParam("deviceId") UUID deviceId, @Body ServiceApi.KeyPackagesRequest request) {
        devices.addKeyPackages(accounts.authenticate(authorization).id(), deviceId, request);
    }

    /** Only for oneself and friends, so strangers cannot drain key packages. */
    @GET
    @Path("/claim/{accountId}")
    public List<ServiceApi.KeyPackageClaim> claim(@Header("Authorization") String authorization, @PathParam("accountId") UUID accountId) {
        var me = accounts.authenticate(authorization).id();

        if (!me.equals(accountId) && !friends.areFriends(me, accountId)) {
            throw ApiException.forbidden("Key packages are only available for friends");
        }

        return devices.claim(accountId);
    }
}
