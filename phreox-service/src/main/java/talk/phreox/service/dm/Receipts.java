package talk.phreox.service.dm;

import talk.phreox.api.ServiceApi;
import talk.phreox.service.crypto.Canonical;
import talk.phreox.service.crypto.ServiceSigner;

import java.util.UUID;

/** Server receipt: proves the service transported this ciphertext, not that the plaintext belongs to it. */
public final class Receipts {

    private static final String DOMAIN = "pxp-receipt-v1";

    private Receipts() {
    }

    public static ServiceApi.Receipt issue(ServiceSigner signer, long eventId, String ciphertextHash, UUID conversationId, UUID senderDevice, long timestamp) {
        return new ServiceApi.Receipt(eventId, ciphertextHash, conversationId, senderDevice, timestamp, signer.sign(message(eventId, ciphertextHash, conversationId, senderDevice, timestamp)));
    }

    public static boolean verify(String servicePublicKey, ServiceApi.Receipt receipt) {
        return ServiceSigner.verify(servicePublicKey, message(receipt.eventId(), receipt.ciphertextHash(), receipt.conversationId(), receipt.senderDevice(), receipt.timestamp()), receipt.signature());
    }

    private static byte[] message(long eventId, String ciphertextHash, UUID conversationId, UUID senderDevice, long timestamp) {
        return Canonical.of(DOMAIN).number(eventId).text(ciphertextHash).uuid(conversationId).uuid(senderDevice).number(timestamp).bytes();
    }
}
