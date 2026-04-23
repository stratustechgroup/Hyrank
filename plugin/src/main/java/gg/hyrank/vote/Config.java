package gg.hyrank.vote;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.Collections;
import java.util.List;

/**
 * Jackson-backed config loader. Reads mods/HyRank/config.json at plugin startup.
 * On first run the default config is written to disk so the operator can fill in
 * apiKey / serverId / hmacSecret without editing JSON by hand.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Config {

    public String apiKey = "";
    public String serverId = "";
    public String hmacSecret = "";
    public int replayWindowSeconds = 300;
    public WebhookConfig webhook = new WebhookConfig();
    public VotifierV2Config votifierV2 = new VotifierV2Config();
    public List<RewardRule> rewards = Collections.emptyList();

    // -------------------------------------------------------------------------
    // Nested config POJOs
    // -------------------------------------------------------------------------

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WebhookConfig {
        public boolean enabled = true;
        public int bindPort = 5523;
        public String path = "/hyrank/vote";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class VotifierV2Config {
        public boolean enabled = false;
        public int bindPort = 8192;
        public String token = "";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RewardRule {
        public String trigger = "vote";
        public List<String> commands = Collections.emptyList();
        public int cooldownSeconds = 86400;
    }

    // -------------------------------------------------------------------------
    // Load / save helpers
    // -------------------------------------------------------------------------

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Loads config from {@code configFile}. If the file does not exist, writes the
     * bundled default and returns that. Throws {@link IOException} on malformed JSON.
     */
    public static Config load(File configFile) throws IOException {
        if (!configFile.exists()) {
            writeDefault(configFile);
            return loadDefault();
        }
        return MAPPER.readValue(configFile, Config.class);
    }

    /** Parses config from an arbitrary JSON string (used in tests). */
    public static Config fromJson(String json) throws IOException {
        return MAPPER.readValue(json, Config.class);
    }

    private static void writeDefault(File target) throws IOException {
        target.getParentFile().mkdirs();
        try (InputStream in = Config.class.getResourceAsStream("/config.default.json")) {
            if (in == null) throw new IOException("Bundled config.default.json missing from JAR");
            Files.copy(in, target.toPath());
        }
    }

    private static Config loadDefault() throws IOException {
        try (InputStream in = Config.class.getResourceAsStream("/config.default.json")) {
            if (in == null) throw new IOException("Bundled config.default.json missing from JAR");
            return MAPPER.readValue(in, Config.class);
        }
    }

    // -------------------------------------------------------------------------
    // Validation helpers
    // -------------------------------------------------------------------------

    /** Returns true if the minimum required fields are non-empty. */
    public boolean isConfigured() {
        return hmacSecret != null && !hmacSecret.isBlank()
                && webhook != null && webhook.enabled;
    }
}
