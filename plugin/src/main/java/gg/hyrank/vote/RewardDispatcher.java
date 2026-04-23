package gg.hyrank.vote;

import java.util.List;
import java.util.logging.Logger;

/**
 * Dispatches configured reward commands when a player casts a vote.
 *
 * Design:
 * - Looks up the matching RewardRule by trigger name.
 * - Substitutes {player} in command strings.
 * - If the player is online: executes commands via the server thread scheduler
 *   (Hytale plugin API — see TODO below).
 * - If the player is offline: delegates to PendingRewards for persistent storage.
 *
 * TODO: Replace the stub scheduler call with the real Hytale server thread
 * dispatch method once the official SDK is finalised.
 */
public class RewardDispatcher {

    private static final Logger LOG = Logger.getLogger(RewardDispatcher.class.getName());

    private final List<Config.RewardRule> rules;
    private final PendingRewards pendingRewards;

    /** Pluggable executor — real implementation calls server main-thread dispatcher. */
    public interface CommandExecutor {
        void execute(String command);
    }

    /** Returns true if the given player name is currently online. */
    public interface PlayerLookup {
        boolean isOnline(String playerName);
    }

    private final CommandExecutor executor;
    private final PlayerLookup    playerLookup;

    public RewardDispatcher(
            List<Config.RewardRule> rules,
            PendingRewards pendingRewards,
            CommandExecutor executor,
            PlayerLookup playerLookup) {
        this.rules          = rules;
        this.pendingRewards = pendingRewards;
        this.executor       = executor;
        this.playerLookup   = playerLookup;
    }

    /**
     * Dispatches the reward for the given player and trigger.
     * Safe to call from any thread; online commands are forwarded to the
     * provided {@link CommandExecutor}.
     */
    public void dispatch(String playerName, String trigger) {
        Config.RewardRule rule = findRule(trigger);
        if (rule == null) {
            LOG.warning("No reward rule for trigger '" + trigger + "' — skipping");
            return;
        }

        List<String> commands = rule.commands.stream()
                .map(cmd -> cmd.replace("{player}", playerName))
                .toList();

        if (playerLookup.isOnline(playerName)) {
            for (String cmd : commands) {
                LOG.fine("Executing reward command: " + cmd);
                executor.execute(cmd);
            }
        } else {
            LOG.info("Player " + playerName + " is offline — queueing reward");
            pendingRewards.enqueue(playerName, commands);
        }
    }

    private Config.RewardRule findRule(String trigger) {
        return rules.stream()
                .filter(r -> r.trigger.equalsIgnoreCase(trigger))
                .findFirst()
                .orElse(null);
    }
}
