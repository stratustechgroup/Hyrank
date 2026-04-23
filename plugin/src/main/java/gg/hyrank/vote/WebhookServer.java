package gg.hyrank.vote;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Embedded HTTP servlet that receives vote webhook POSTs from HyRank.
 *
 * Endpoint: POST /hyrank/vote (configurable via config.json)
 *
 * Pipeline:
 *   1. Read raw body
 *   2. Validate HMAC via HmacVerifier (rejects replays via timestamp window)
 *   3. Reject duplicate nonces via NonceCache (24h dedup)
 *   4. Parse player + trigger from JSON body
 *   5. Delegate reward dispatch to RewardDispatcher
 *   6. Always respond 204 — reward is async, HyRank does not wait for result
 *
 * NOTE: This servlet is designed to be registered with whatever embedded HTTP
 * container the Hytale plugin runtime provides. The exact registration call
 * in HyRankPlugin.java is marked TODO pending official SDK docs.
 */
public class WebhookServer extends HttpServlet {

    private static final Logger LOG = Logger.getLogger(WebhookServer.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final HmacVerifier hmacVerifier;
    private final NonceCache   nonceCache;
    private final RewardDispatcher rewardDispatcher;
    private final String expectedPath;

    public WebhookServer(
            HmacVerifier hmacVerifier,
            NonceCache nonceCache,
            RewardDispatcher rewardDispatcher,
            String expectedPath) {
        this.hmacVerifier    = hmacVerifier;
        this.nonceCache      = nonceCache;
        this.rewardDispatcher = rewardDispatcher;
        this.expectedPath    = expectedPath;
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // Wrong path — 404
        if (!expectedPath.equals(req.getPathInfo()) && !expectedPath.equals(req.getServletPath())) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        byte[] rawBody = req.getInputStream().readAllBytes();

        // --- HMAC verification ---
        String timestamp = req.getHeader("X-HyRank-Timestamp");
        String signature = req.getHeader("X-HyRank-Signature");
        try {
            hmacVerifier.verify(timestamp, signature, rawBody);
        } catch (HmacVerifier.HmacException e) {
            LOG.warning("HMAC verification failed: " + e.getMessage());
            resp.sendError(HttpServletResponse.SC_UNAUTHORIZED, e.getMessage());
            return;
        }

        // --- Nonce dedup ---
        JsonNode root;
        try {
            root = MAPPER.readTree(rawBody);
        } catch (IOException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid JSON");
            return;
        }

        String nonce = root.path("nonce").asText(null);
        if (nonce == null || !nonceCache.checkAndAdd(nonce)) {
            LOG.warning("Rejected duplicate or missing nonce: " + nonce);
            resp.sendError(HttpServletResponse.SC_CONFLICT, "Duplicate nonce");
            return;
        }

        // --- Extract vote payload ---
        String playerName = root.path("voterUsername").asText(null);
        String trigger    = root.path("trigger").asText("vote");
        if (playerName == null) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing voterUsername");
            return;
        }

        // --- Respond 204 immediately (fire-and-forget reward dispatch) ---
        resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
        resp.getOutputStream().flush();

        // Dispatch asynchronously — do not block the servlet thread
        try {
            rewardDispatcher.dispatch(playerName, trigger);
        } catch (Exception e) {
            // Log but do not re-throw (response already committed)
            LOG.log(Level.WARNING, "Reward dispatch error for " + playerName, e);
        }
    }
}
