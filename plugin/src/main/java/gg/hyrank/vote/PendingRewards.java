package gg.hyrank.vote;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Persistent queue for rewards owed to offline players.
 *
 * Backed by {@code pending_rewards.json} on disk.
 * When a player joins (via the Hytale PlayerJoinEvent — TODO: wire in
 * HyRankPlugin once the Hytale SDK event API is finalised), call
 * {@link #applyForPlayer} to flush their pending commands.
 *
 * Format: { "PlayerName": ["cmd1", "cmd2", ...], ... }
 */
public class PendingRewards {

    private static final Logger LOG = Logger.getLogger(PendingRewards.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, List<String>>> TYPE_REF
            = new TypeReference<>() {};

    private final File storeFile;
    /** In-memory mirror; guarded by synchronized(this). */
    private final Map<String, List<String>> pending = new ConcurrentHashMap<>();

    public PendingRewards(File storeFile) {
        this.storeFile = storeFile;
        load();
    }

    /** Adds reward commands for an offline player and flushes to disk. */
    public synchronized void enqueue(String playerName, List<String> commands) {
        pending.computeIfAbsent(playerName, k -> new ArrayList<>()).addAll(commands);
        save();
    }

    /**
     * Returns and removes all pending commands for {@code playerName}.
     * Returns empty list if no rewards are pending.
     * The caller (HyRankPlugin's join handler) is responsible for executing them.
     */
    public synchronized List<String> applyForPlayer(String playerName) {
        List<String> cmds = pending.remove(playerName);
        if (cmds == null || cmds.isEmpty()) return Collections.emptyList();
        save();
        return cmds;
    }

    /** Returns true if there are any pending rewards for the given player. */
    public boolean hasPending(String playerName) {
        return pending.containsKey(playerName) && !pending.get(playerName).isEmpty();
    }

    // -------------------------------------------------------------------------
    // Disk I/O
    // -------------------------------------------------------------------------

    private void load() {
        if (!storeFile.exists()) return;
        try {
            Map<String, List<String>> loaded = MAPPER.readValue(storeFile, TYPE_REF);
            pending.putAll(loaded);
            LOG.info("Loaded " + pending.size() + " pending reward entries from disk");
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Could not read pending_rewards.json — starting fresh", e);
        }
    }

    private void save() {
        try {
            storeFile.getParentFile().mkdirs();
            MAPPER.writerWithDefaultPrettyPrinter().writeValue(storeFile, pending);
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "Failed to persist pending_rewards.json", e);
        }
    }
}
