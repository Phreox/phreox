package talk.phreox.service.crypto;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/** PBKDF2-HMAC-SHA256 from the JDK. The stored form carries its own parameters: pbkdf2-sha256$iterations$salt$hash. */
public final class PasswordHasher {

    private static final String PREFIX = "pbkdf2-sha256";
    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int SALT_BYTES = 16;
    private static final int HASH_BITS = 256;
    private static final int MAX_ITERATIONS = 10_000_000;

    private final SecureRandom random = new SecureRandom();
    private final int iterations;

    public PasswordHasher(int iterations) {
        this.iterations = iterations;
    }

    public String hash(String password) {
        var salt = new byte[SALT_BYTES];
        random.nextBytes(salt);

        return PREFIX + "$" + iterations + "$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(derive(password, salt, iterations));
    }

    public boolean matches(String password, String stored) {
        var parts = stored.split("\\$");

        if (parts.length != 4 || !parts[0].equals(PREFIX)) {
            return false;
        }

        try {
            var storedIterations = Integer.parseInt(parts[1]);

            if (storedIterations < 1 || storedIterations > MAX_ITERATIONS) {
                return false;
            }

            var expected = Base64.getDecoder().decode(parts[3]);
            var actual = derive(password, Base64.getDecoder().decode(parts[2]), storedIterations);

            return MessageDigest.isEqual(expected, actual);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static byte[] derive(String password, byte[] salt, int iterations) {
        var spec = new PBEKeySpec(password.toCharArray(), salt, iterations, HASH_BITS);

        try {
            return SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Password hashing failed", exception);
        } finally {
            spec.clearPassword();
        }
    }
}
