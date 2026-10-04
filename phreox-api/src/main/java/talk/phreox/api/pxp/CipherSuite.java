package talk.phreox.api.pxp;

/** Codes match the MLS cipher suite registry of RFC 9420. */
public enum CipherSuite {
    TRANSPORT_ONLY(0x0000),
    MLS_128_DHKEMX25519_AES128GCM_SHA256_ED25519(0x0001),
    MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_ED25519(0x0003);

    private final int code;

    CipherSuite(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static CipherSuite of(int code) {
        for (var suite : values()) {
            if (suite.code == code) {
                return suite;
            }
        }

        return null;
    }
}
