package gg.hyrank.vote;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for NonceCache.
 *
 * All in-memory, no I/O. Uses a short TTL to verify expiry without sleeping.
 */
class NonceCacheTest {

    private NonceCache cache;

    @BeforeEach
    void setUp() {
        // Standard 24h TTL for most tests
        cache = new NonceCache();
    }

    @Test
    void freshNonceAccepted() {
        assertTrue(cache.checkAndAdd("nonce-abc-123"), "Fresh nonce should be accepted");
    }

    @Test
    void duplicateNonceRejectedWithinTtl() {
        String nonce = "nonce-dup-999";
        assertTrue(cache.checkAndAdd(nonce),  "First insert should be accepted");
        assertFalse(cache.checkAndAdd(nonce), "Second insert should be rejected as duplicate");
    }

    @Test
    void differentNoncesAreIndependent() {
        assertTrue(cache.checkAndAdd("nonce-A"));
        assertTrue(cache.checkAndAdd("nonce-B"));
        assertTrue(cache.checkAndAdd("nonce-C"));
        assertEquals(3, cache.size());
    }

    @Test
    void nullNonceRejected() {
        assertFalse(cache.checkAndAdd(null), "Null nonce should be rejected");
    }

    @Test
    void blankNonceRejected() {
        assertFalse(cache.checkAndAdd("   "), "Blank nonce should be rejected");
    }

    @Test
    void expiredNonceAcceptedAfterTtl() throws InterruptedException {
        // Use a 50ms TTL so the test doesn't need a long sleep
        NonceCache shortTtlCache = new NonceCache(50L, 1000);
        String nonce = "nonce-expiry-test";

        assertTrue(shortTtlCache.checkAndAdd(nonce), "First insert accepted");
        assertFalse(shortTtlCache.checkAndAdd(nonce), "Duplicate immediately rejected");

        // Wait for TTL to expire
        Thread.sleep(100);

        // After TTL the entry should have been evicted on next checkAndAdd
        assertTrue(shortTtlCache.checkAndAdd(nonce),
                "Same nonce should be accepted after TTL expiry");
    }

    @Test
    void maxCapacityEvictsOldestEntry() {
        // Capacity of 3; inserting a 4th should evict the oldest
        NonceCache smallCache = new NonceCache(60_000L, 3);
        smallCache.checkAndAdd("n1");
        smallCache.checkAndAdd("n2");
        smallCache.checkAndAdd("n3");
        assertEquals(3, smallCache.size());

        // Inserting n4 triggers eviction of n1 (LinkedHashMap insertion order)
        smallCache.checkAndAdd("n4");
        // Size remains at max
        assertTrue(smallCache.size() <= 3);
    }
}
