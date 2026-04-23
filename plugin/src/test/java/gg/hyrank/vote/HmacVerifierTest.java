package gg.hyrank.vote;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for HmacVerifier.
 *
 * All tests are pure in-memory — no I/O, no network, no Hytale server.
 * Total runtime target: < 200ms.
 */
class HmacVerifierTest {

    private static final String SECRET = "test-secret-key-32-bytes-padded!";
    private static final int WINDOW_SECONDS = 300;
    private static final byte[] BODY = "{\"voterUsername\":\"Steve\"}".getBytes(StandardCharsets.UTF_8);

    private HmacVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new HmacVerifier(SECRET, WINDOW_SECONDS);
    }

    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------

    @Test
    void validSignaturePasses() throws Exception {
        long now = System.currentTimeMillis() / 1000L;
        byte[] expectedHmac = verifier.computeHmac(now, BODY);
        String sigHex = HmacVerifier.hexEncode(expectedHmac);

        assertDoesNotThrow(() -> verifier.verify(String.valueOf(now), sigHex, BODY));
    }

    // -------------------------------------------------------------------------
    // Replay window
    // -------------------------------------------------------------------------

    @Test
    void expiredTimestampRejected() throws Exception {
        long expired = (System.currentTimeMillis() / 1000L) - WINDOW_SECONDS - 1;
        byte[] hmac = verifier.computeHmac(expired, BODY);
        String sigHex = HmacVerifier.hexEncode(hmac);

        HmacVerifier.HmacException ex = assertThrows(
                HmacVerifier.HmacException.class,
                () -> verifier.verify(String.valueOf(expired), sigHex, BODY));

        assertTrue(ex.getMessage().contains("replay window"),
                "Expected 'replay window' in: " + ex.getMessage());
    }

    @Test
    void futureTimestampBeyondWindowRejected() throws Exception {
        long future = (System.currentTimeMillis() / 1000L) + WINDOW_SECONDS + 1;
        byte[] hmac = verifier.computeHmac(future, BODY);
        String sigHex = HmacVerifier.hexEncode(hmac);

        assertThrows(HmacVerifier.HmacException.class,
                () -> verifier.verify(String.valueOf(future), sigHex, BODY));
    }

    // -------------------------------------------------------------------------
    // Tampered body
    // -------------------------------------------------------------------------

    @Test
    void tamperedBodyRejected() throws Exception {
        long now = System.currentTimeMillis() / 1000L;
        byte[] hmac = verifier.computeHmac(now, BODY);
        String sigHex = HmacVerifier.hexEncode(hmac);

        byte[] tampered = "{\"voterUsername\":\"Hacker\"}".getBytes(StandardCharsets.UTF_8);

        HmacVerifier.HmacException ex = assertThrows(
                HmacVerifier.HmacException.class,
                () -> verifier.verify(String.valueOf(now), sigHex, tampered));

        assertTrue(ex.getMessage().contains("Signature mismatch"),
                "Expected 'Signature mismatch' in: " + ex.getMessage());
    }

    // -------------------------------------------------------------------------
    // Missing headers
    // -------------------------------------------------------------------------

    @Test
    void missingTimestampHeaderRejected() {
        HmacVerifier.HmacException ex = assertThrows(
                HmacVerifier.HmacException.class,
                () -> verifier.verify(null, "deadbeef", BODY));

        assertTrue(ex.getMessage().contains("Timestamp"), ex.getMessage());
    }

    @Test
    void missingSignatureHeaderRejected() {
        long now = System.currentTimeMillis() / 1000L;
        HmacVerifier.HmacException ex = assertThrows(
                HmacVerifier.HmacException.class,
                () -> verifier.verify(String.valueOf(now), null, BODY));

        assertTrue(ex.getMessage().contains("Signature"), ex.getMessage());
    }

    // -------------------------------------------------------------------------
    // Constant-time comparison sanity
    // -------------------------------------------------------------------------

    @Test
    void wrongSignatureRejected() {
        long now = System.currentTimeMillis() / 1000L;
        // All-zero hex signature — 32 bytes = 64 hex chars
        String wrongSig = "0".repeat(64);

        assertThrows(HmacVerifier.HmacException.class,
                () -> verifier.verify(String.valueOf(now), wrongSig, BODY));
    }
}
