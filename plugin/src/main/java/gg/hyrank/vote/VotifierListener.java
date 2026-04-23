package gg.hyrank.vote;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Optional Votifier V2 (HMAC-auth variant) TCP listener on port 8192.
 *
 * Provides compatibility with listing sites that send Votifier V2 payloads
 * rather than HyRank's native webhook format.
 *
 * Protocol (V2 HMAC, simplified):
 *   1. Server sends challenge line: "VOTIFIERPLUS <version> <challenge>\n"
 *   2. Client sends JSON payload: { "username": "...", "serviceName": "...", "token": "..." }
 *   3. Server validates token == HMAC-SHA256(challenge, secret)
 *   4. Server sends "OK\n" or "ERROR\n"
 *
 * NOTE: Full RSA Votifier V1 is intentionally excluded — it requires key-pair
 * management and is obsolete. Use V2 HMAC or the native HyRank webhook.
 */
public class VotifierListener implements Runnable {

    private static final Logger LOG = Logger.getLogger(VotifierListener.class.getName());
    private static final String PROTOCOL_VERSION = "v2.0";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final int port;
    private final String token;
    private final HmacVerifier hmacVerifier;
    private final RewardDispatcher rewardDispatcher;
    private final AtomicBoolean running = new AtomicBoolean(false);

    private ServerSocket serverSocket;
    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "hyrank-votifier-handler");
        t.setDaemon(true);
        return t;
    });

    public VotifierListener(int port, String token, HmacVerifier hmacVerifier,
                            RewardDispatcher rewardDispatcher) {
        this.port             = port;
        this.token            = token;
        this.hmacVerifier     = hmacVerifier;
        this.rewardDispatcher = rewardDispatcher;
    }

    @Override
    public void run() {
        try {
            serverSocket = new ServerSocket(port);
            running.set(true);
            LOG.info("VotifierListener started on port " + port);
            while (running.get() && !serverSocket.isClosed()) {
                try {
                    Socket client = serverSocket.accept();
                    executor.submit(() -> handle(client));
                } catch (IOException e) {
                    if (running.get()) LOG.warning("Accept error: " + e.getMessage());
                }
            }
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "Could not bind Votifier listener on port " + port, e);
        }
    }

    public void stop() {
        running.set(false);
        executor.shutdownNow();
        try { if (serverSocket != null) serverSocket.close(); } catch (IOException ignored) {}
    }

    private void handle(Socket socket) {
        try (socket;
             BufferedReader in  = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
             PrintWriter    out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true)) {

            // Send challenge
            String challenge = Long.toHexString(System.nanoTime());
            out.println("VOTIFIERPLUS " + PROTOCOL_VERSION + " " + challenge);

            // Read payload
            String line = in.readLine();
            if (line == null) return;

            JsonNode payload;
            try { payload = MAPPER.readTree(line); }
            catch (IOException e) { out.println("ERROR"); return; }

            String username    = payload.path("username").asText(null);
            String serviceName = payload.path("serviceName").asText("unknown");
            String clientToken = payload.path("token").asText(null);

            if (username == null || clientToken == null) { out.println("ERROR"); return; }

            // Validate token = HMAC(challenge, token/secret)
            // For V2 HMAC we verify that HMAC(secret, challenge) == clientToken
            try {
                byte[] challengeBytes = challenge.getBytes(StandardCharsets.UTF_8);
                byte[] expected = hmacVerifier.computeHmac(0L, challengeBytes);
                byte[] actual   = java.util.HexFormat.of().parseHex(clientToken);
                if (!java.security.MessageDigest.isEqual(expected, actual)) {
                    out.println("ERROR"); return;
                }
            } catch (Exception e) {
                out.println("ERROR"); return;
            }

            out.println("OK");
            LOG.info("Votifier V2 vote from " + username + " via " + serviceName);
            rewardDispatcher.dispatch(username, "vote");

        } catch (IOException e) {
            LOG.log(Level.WARNING, "Error handling Votifier connection", e);
        }
    }
}
