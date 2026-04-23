package gg.hyrank.vote;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Thread-safe bounded LRU nonce cache with a 24-hour TTL.
 *
 * Each vote webhook carries a unique nonce. We store the nonce + arrival time
 * and reject any duplicate within the TTL window. Entries older than
 * {@code ttlMillis} are lazily evicted on {@link #checkAndAdd}.
 *
 * The backing store is a size-bounded {@link LinkedHashMap} in insertion order;
 * its max capacity is a safety cap so a flood of unique nonces cannot exhaust heap.
 */
public class NonceCache {

    private static final long DEFAULT_TTL_MS = 24L * 60 * 60 * 1000; // 24 h
    private static final int  DEFAULT_MAX    = 100_000;

    private final long ttlMillis;
    private final int  maxEntries;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    /** nonce → arrival time (epoch millis) */
    private final Map<String, Long> store;

    public NonceCache() {
        this(DEFAULT_TTL_MS, DEFAULT_MAX);
    }

    public NonceCache(long ttlMillis, int maxEntries) {
        this.ttlMillis  = ttlMillis;
        this.maxEntries = maxEntries;
        this.store = new LinkedHashMap<>(256, 0.75f, false) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Long> eldest) {
                return size() > maxEntries;
            }
        };
    }

    /**
     * Checks whether {@code nonce} is a duplicate and, if not, records it.
     *
     * @return {@code true} if the nonce is fresh (accepted); {@code false} if it
     *         was already seen within the TTL (rejected).
     */
    public boolean checkAndAdd(String nonce) {
        if (nonce == null || nonce.isBlank()) return false;

        long now = Instant.now().toEpochMilli();

        lock.writeLock().lock();
        try {
            evictExpired(now);

            if (store.containsKey(nonce)) {
                return false; // duplicate
            }
            store.put(nonce, now);
            return true;
        } finally {
            lock.writeLock().unlock();
        }
    }

    /** Returns the number of live entries currently in the cache. */
    public int size() {
        lock.readLock().lock();
        try {
            return store.size();
        } finally {
            lock.readLock().unlock();
        }
    }

    /** Removes all entries whose arrival time is older than {@code ttlMillis}. */
    private void evictExpired(long nowMillis) {
        long cutoff = nowMillis - ttlMillis;
        store.entrySet().removeIf(e -> e.getValue() < cutoff);
    }
}
