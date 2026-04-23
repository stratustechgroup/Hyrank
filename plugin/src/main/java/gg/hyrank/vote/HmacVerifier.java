package gg.hyrank.vote;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Constant-time HMAC-SHA256 verifier for HyRank vote webhooks.
 *
 * Signature format mirrors the Stripe pattern:
 *   signed_payload = timestamp + "." + rawBody
 *   signature      = hex( HMAC-SHA256(secret, signed_payload) )
 *
 * The {@code X-HyRank-Timestamp} header carries the Unix epoch seconds at
 * which HyRank generated the request. We reject payloads older than
 * {@code replayWindowSeconds} (default 300 s).
 */
public class HmacVerifier {

    private static final String ALGORITHM = "HmacSHA256";

    private final byte[] secretBytes;
    private final int replayWindowSeconds;

    public HmacVerifier(String secret, int replayWindowSeconds) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("HMAC secret must not be blank");
        }
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.replayWindowSeconds = replayWindowSeconds;
    }

    /**
     * Verifies an incoming webhook request.
     *
     * @param timestampHeader value of the {@code X-HyRank-Timestamp} header (Unix seconds)
     * @param signatureHeader value of the {@code X-HyRank-Signature} header (hex)
     * @param rawBody         the raw request body bytes
     * @throws HmacException if the signature is invalid, the timestamp is expired,
     *                       or a required header is missing
     */
    public void verify(String timestampHeader, String signatureHeader, byte[] rawBody)
            throws HmacException {
        if (timestampHeader == null || timestampHeader.isBlank()) {
            throw new HmacException("Missing X-HyRank-Timestamp header");
        }
        if (signatureHeader == null || signatureHeader.isBlank()) {
            throw new HmacException("Missing X-HyRank-Signature header");
        }

        long timestamp;
        try {
            timestamp = Long.parseLong(timestampHeader.trim());
        } catch (NumberFormatException e) {
            throw new HmacException("Unparseable timestamp: " + timestampHeader);
        }

        long nowSeconds = System.currentTimeMillis() / 1000L;
        long delta = nowSeconds - timestamp;
        if (Math.abs(delta) > replayWindowSeconds) {
            throw new HmacException("Timestamp outside replay window (delta=" + delta + "s)");
        }

        byte[] expected = computeHmac(timestamp, rawBody);
        byte[] actual   = hexDecode(signatureHeader.trim());

        if (!MessageDigest.isEqual(expected, actual)) {
            throw new HmacException("Signature mismatch");
        }
    }

    /**
     * Computes HMAC-SHA256 over {@code timestamp + "." + rawBody}.
     * Exposed package-private for tests.
     */
    byte[] computeHmac(long timestamp, byte[] rawBody) throws HmacException {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secretBytes, ALGORITHM));
            mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
            mac.update(rawBody);
            return mac.doFinal();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new HmacException("HMAC computation failed: " + e.getMessage(), e);
        }
    }

    /** Hex-encodes a byte array using lowercase. */
    public static String hexEncode(byte[] bytes) {
        return HexFormat.of().formatHex(bytes);
    }

    private static byte[] hexDecode(String hex) throws HmacException {
        try {
            return HexFormat.of().parseHex(hex);
        } catch (IllegalArgumentException e) {
            throw new HmacException("Invalid hex in signature header: " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Exception type
    // -------------------------------------------------------------------------

    public static class HmacException extends Exception {
        public HmacException(String message) { super(message); }
        public HmacException(String message, Throwable cause) { super(message, cause); }
    }
}
