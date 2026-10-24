package talk.phreox.service.crypto;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/** Ed25519 service signing key from the JDK. Public keys are Base64 X.509, signatures are Base64. */
public final class ServiceSigner {

    public static final String ALGORITHM = "Ed25519";

    private final KeyPair keys;
    private final String publicKey;

    private ServiceSigner(KeyPair keys) {
        this.keys = keys;
        this.publicKey = Base64.getEncoder().encodeToString(keys.getPublic().getEncoded());
    }

    public static ServiceSigner generate() {
        try {
            return new ServiceSigner(KeyPairGenerator.getInstance(ALGORITHM).generateKeyPair());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Ed25519 is not available", exception);
        }
    }

    /** Loads the key pair from the file, or generates and stores it with owner-only permissions if missing. */
    public static ServiceSigner loadOrCreate(Path file) {
        try {
            if (Files.exists(file)) {
                return read(file);
            }

            var signer = generate();
            create(file);
            Files.writeString(file, Base64.getEncoder().encodeToString(signer.keys.getPrivate().getEncoded()) + "\n" + signer.publicKey + "\n");

            return signer;
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    public String publicKey() {
        return publicKey;
    }

    public String sign(byte[] message) {
        try {
            var signature = Signature.getInstance(ALGORITHM);
            signature.initSign(keys.getPrivate());
            signature.update(message);

            return Base64.getEncoder().encodeToString(signature.sign());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Signing failed", exception);
        }
    }

    public boolean verify(byte[] message, String signature) {
        return verify(publicKey, message, signature);
    }

    /** Never throws for malformed input, a bad key or signature is simply invalid. */
    public static boolean verify(String publicKey, byte[] message, String signature) {
        if (publicKey == null || signature == null) {
            return false;
        }

        try {
            var key = parsePublicKey(publicKey);
            var verifier = Signature.getInstance(ALGORITHM);
            verifier.initVerify(key);
            verifier.update(message);

            return verifier.verify(Base64.getDecoder().decode(signature));
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            return false;
        }
    }

    /** Rejects anything that is not a valid Ed25519 public key. */
    public static PublicKey parsePublicKey(String encoded) throws GeneralSecurityException {
        var key = KeyFactory.getInstance(ALGORITHM).generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(encoded)));

        if (!ALGORITHM.equals(key.getAlgorithm()) && !"EdDSA".equals(key.getAlgorithm())) {
            throw new GeneralSecurityException("Not an Ed25519 key");
        }

        return key;
    }

    private static void create(Path file) throws IOException {
        try {
            Files.createFile(file, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        } catch (UnsupportedOperationException exception) {
            Files.createFile(file);
        }
    }

    private static ServiceSigner read(Path file) throws IOException {
        var lines = Files.readAllLines(file, StandardCharsets.UTF_8);

        if (lines.size() < 2) {
            throw new IllegalStateException("Invalid signing key file: " + file);
        }

        try {
            var factory = KeyFactory.getInstance(ALGORITHM);
            var privateKey = factory.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(lines.get(0).trim())));
            var publicKey = factory.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(lines.get(1).trim())));

            return new ServiceSigner(new KeyPair(publicKey, privateKey));
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("Invalid signing key file: " + file, exception);
        }
    }
}
