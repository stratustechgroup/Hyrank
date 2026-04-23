package gg.hyrank.vote;

import java.io.File;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * HyRank Vote Plugin entry point.
 *
 * Implements the Hytale plugin lifecycle. The Hytale plugin SDK is still evolving;
 * this class uses a minimal stub interface (HytalePlugin) with onEnable / onDisable.
 *
 * TODO: Replace HytalePlugin stub with the real interface once the official Hytale
 * plugin SDK (Britakee GitBook) is finalised. Specifically:
 *   - Replace serverDataDir() stub with the SDK's data-directory API
 *   - Wire registerCommand() for /redeem
 *   - Wire registerPlayerJoinListener() for pending reward delivery
 *   - Register the WebhookServer with the embedded HTTP container
 *
 * Startup sequence:
 *   1. Load or create config from mods/HyRank/config.json
 *   2. Validate config is populated (warn if using defaults)
 *   3. Initialise NonceCache + HmacVerifier
 *   4. Start WebhookServer on config.webhook.bindPort
 *   5. Optionally start VotifierListener on config.votifierV2.bindPort
 *   6. Register /redeem command handler
 *   7. Register player-join listener for pending rewards
 */
public class HyRankPlugin implements HytalePlugin {

    private static final Logger LOG = Logger.getLogger(HyRankPlugin.class.getName());
    private static final String CONFIG_PATH = "mods/HyRank/config.json";

    private Config config;
    private NonceCache nonceCache;
    private HmacVerifier hmacVerifier;
    private PendingRewards pendingRewards;
    private RewardDispatcher rewardDispatcher;
    private Thread votifierThread;

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    @Override
    public void onEnable() {
        LOG.info("[HyRank] Enabling HyRank Vote Plugin v0.1.0");

        // 1. Load config
        File configFile = new File(serverDataDir(), CONFIG_PATH);
        try {
            config = Config.load(configFile);
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "[HyRank] Failed to load config — plugin disabled", e);
            return;
        }

        if (!config.isConfigured()) {
            LOG.warning("[HyRank] HMAC secret is not configured. "
                    + "Edit " + configFile.getPath() + " and restart the server.");
        }

        // 2. Init core components
        nonceCache   = new NonceCache();
        try {
            hmacVerifier = new HmacVerifier(
                    config.hmacSecret.isBlank() ? "unconfigured" : config.hmacSecret,
                    config.replayWindowSeconds);
        } catch (IllegalArgumentException e) {
            LOG.log(Level.SEVERE, "[HyRank] Invalid HMAC config", e);
            return;
        }

        File pendingFile = new File(serverDataDir(), "mods/HyRank/pending_rewards.json");
        pendingRewards = new PendingRewards(pendingFile);

        // Stub executor — TODO: replace with Hytale main-thread scheduler
        RewardDispatcher.CommandExecutor cmdExecutor = cmd -> LOG.info("[HyRank] EXECUTE: " + cmd);
        // Stub player lookup — TODO: replace with Hytale player-online API
        RewardDispatcher.PlayerLookup lookup = playerName -> false;

        rewardDispatcher = new RewardDispatcher(
                config.rewards, pendingRewards, cmdExecutor, lookup);

        // 3. Start webhook server
        if (config.webhook.enabled) {
            WebhookServer webhookServer = new WebhookServer(
                    hmacVerifier, nonceCache, rewardDispatcher, config.webhook.path);
            // TODO: register webhookServer with the Hytale embedded HTTP container
            // e.g. server.registerServlet(config.webhook.bindPort, webhookServer);
            LOG.info("[HyRank] Webhook receiver configured on port " + config.webhook.bindPort);
        }

        // 4. Start Votifier listener (optional)
        if (config.votifierV2.enabled) {
            VotifierListener votifier = new VotifierListener(
                    config.votifierV2.bindPort,
                    config.votifierV2.token,
                    hmacVerifier,
                    rewardDispatcher);
            votifierThread = new Thread(votifier, "hyrank-votifier");
            votifierThread.setDaemon(true);
            votifierThread.start();
            LOG.info("[HyRank] VotifierListener started on port " + config.votifierV2.bindPort);
        }

        // 5. Register /redeem command
        // TODO: registerCommand("redeem", (player, args) -> {
        //     String code = args.length > 0 ? args[0] : "";
        //     redeemCmd.execute(player.getName(), code);
        // });

        // 6. Register player-join listener for pending rewards
        // TODO: registerPlayerJoinListener(player -> {
        //     List<String> cmds = pendingRewards.applyForPlayer(player.getName());
        //     cmds.forEach(cmdExecutor::execute);
        // });

        LOG.info("[HyRank] HyRank Vote Plugin enabled.");
    }

    @Override
    public void onDisable() {
        if (votifierThread != null) votifierThread.interrupt();
        LOG.info("[HyRank] HyRank Vote Plugin disabled.");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Returns the server root directory (working directory of the process). */
    private File serverDataDir() {
        return new File(System.getProperty("user.dir", "."));
    }
}
