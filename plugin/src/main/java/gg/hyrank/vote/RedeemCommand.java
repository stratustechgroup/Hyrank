package gg.hyrank.vote;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Handles the /redeem <code> in-game command.
 *
 * When a player runs /redeem <code>, this class:
 *  1. Makes an HTTPS call to https://hyrank.gg/api/redeem to validate the code.
 *  2. If valid, invokes RewardDispatcher with the trigger returned by the API.
 *  3. Sends the player a feedback message.
 *
 * NOTE: Actual command registration with the Hytale plugin runtime is handled
 * in HyRankPlugin.java (TODO: wire once official SDK docs are available).
 */
public class RedeemCommand {

    private static final Logger LOG = Logger.getLogger(RedeemCommand.class.getName());
    private static final String REDEEM_API = "https://hyrank.gg/api/redeem";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Minimal interface to send a message back to the in-game player. */
    public interface PlayerMessenger {
        void sendMessage(String playerName, String message);
    }

    private final String apiKey;
    private final RewardDispatcher rewardDispatcher;
    private final PlayerMessenger messenger;
    private final HttpClient httpClient;

    public RedeemCommand(String apiKey, RewardDispatcher rewardDispatcher, PlayerMessenger messenger) {
        this.apiKey           = apiKey;
        this.rewardDispatcher = rewardDispatcher;
        this.messenger        = messenger;
        this.httpClient       = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Called by the Hytale command handler when a player runs /redeem <code>.
     *
     * @param playerName the name of the player issuing the command
     * @param code       the redemption code they provided
     */
    public void execute(String playerName, String code) {
        if (code == null || code.isBlank()) {
            messenger.sendMessage(playerName, "[HyRank] Usage: /redeem <code>");
            return;
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(REDEEM_API))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"playerName\":\"" + sanitize(playerName) + "\","
                        + "\"code\":\"" + sanitize(code) + "\"}"))
                .timeout(Duration.ofSeconds(15))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            handleResponse(playerName, response);
        } catch (IOException | InterruptedException e) {
            LOG.log(Level.WARNING, "Redeem API call failed for " + playerName, e);
            messenger.sendMessage(playerName, "[HyRank] Could not reach HyRank servers. Try again later.");
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
        }
    }

    private void handleResponse(String playerName, HttpResponse<String> response) {
        int status = response.statusCode();
        if (status == 200) {
            try {
                JsonNode body = MAPPER.readTree(response.body());
                String trigger = body.path("trigger").asText("vote");
                rewardDispatcher.dispatch(playerName, trigger);
                String message = body.path("message").asText("Reward redeemed!");
                messenger.sendMessage(playerName, "[HyRank] " + message);
            } catch (IOException e) {
                LOG.warning("Malformed redeem API response: " + response.body());
                messenger.sendMessage(playerName, "[HyRank] Redemption processed.");
            }
        } else if (status == 404) {
            messenger.sendMessage(playerName, "[HyRank] Invalid or expired code.");
        } else if (status == 409) {
            messenger.sendMessage(playerName, "[HyRank] Code already redeemed.");
        } else {
            messenger.sendMessage(playerName, "[HyRank] Redemption failed (error " + status + ").");
        }
    }

    /** Minimal sanitisation — strip characters unsafe in JSON string literals. */
    private static String sanitize(String input) {
        return input.replaceAll("[\"\\\\]", "_").substring(0, Math.min(input.length(), 64));
    }
}
