package talk.phreox.service;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.Path;
import talk.phreox.service.crypto.ServiceSigner;

/** Public key clients use to check receipts, node identities and entitlements. */
@Path("/service")
public final class ServiceController {

    private final ServiceSigner signer;

    public ServiceController(ServiceSigner signer) {
        this.signer = signer;
    }

    @GET
    @Path("/keys")
    public ServiceApi.ServiceKeyResponse keys() {
        return new ServiceApi.ServiceKeyResponse(ServiceSigner.ALGORITHM, signer.publicKey());
    }
}
