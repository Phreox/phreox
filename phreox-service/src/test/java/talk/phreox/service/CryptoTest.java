package talk.phreox.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import talk.phreox.service.crypto.Canonical;
import talk.phreox.service.crypto.PasswordHasher;
import talk.phreox.service.crypto.ServiceSigner;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CryptoTest {

    @Test
    void signsAndVerifies() {
        var signer = ServiceSigner.generate();
        var message = "hallo".getBytes();
        var signature = signer.sign(message);

        assertTrue(signer.verify(message, signature));
        assertTrue(ServiceSigner.verify(signer.publicKey(), message, signature));
    }

    @Test
    void rejectsManipulatedMessageSignatureAndForeignKey() {
        var signer = ServiceSigner.generate();
        var message = "hallo".getBytes();
        var signature = signer.sign(message);

        assertFalse(signer.verify("hallo!".getBytes(), signature));
        assertFalse(signer.verify(message, ServiceSigner.generate().sign(message)));
        assertFalse(ServiceSigner.verify(ServiceSigner.generate().publicKey(), message, signature));
        assertFalse(signer.verify(message, "not base64 !"));
        assertFalse(signer.verify(message, null));
        assertFalse(ServiceSigner.verify("garbage", message, signature));
    }

    @Test
    void persistsKeyPair(@TempDir Path directory) {
        var file = directory.resolve("service.key");
        var first = ServiceSigner.loadOrCreate(file);
        var second = ServiceSigner.loadOrCreate(file);

        assertEquals(first.publicKey(), second.publicKey());
        assertTrue(first.verify("x".getBytes(), second.sign("x".getBytes())));
    }

    @Test
    void canonicalEncodingIsUnambiguous() {
        var a = Canonical.of("d").list(List.of("ab", "c")).bytes();
        var b = Canonical.of("d").list(List.of("a", "bc")).bytes();
        var otherDomain = Canonical.of("e").list(List.of("ab", "c")).bytes();

        assertFalse(java.util.Arrays.equals(a, b));
        assertFalse(java.util.Arrays.equals(a, otherDomain));
        assertArrayEquals(a, Canonical.of("d").list(List.of("ab", "c")).bytes());
    }

    @Test
    void hashesPasswordsWithSalt() {
        var hasher = new PasswordHasher(1000);
        var first = hasher.hash("correct horse battery");
        var second = hasher.hash("correct horse battery");

        assertNotEquals(first, second);
        assertTrue(hasher.matches("correct horse battery", first));
        assertFalse(hasher.matches("correct horse batterx", first));
        assertFalse(hasher.matches("x", "garbage"));
        assertFalse(hasher.matches("x", "pbkdf2-sha256$99999999999$AA==$AA=="));
    }
}
