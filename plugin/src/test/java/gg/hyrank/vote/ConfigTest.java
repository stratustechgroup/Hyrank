package gg.hyrank.vote;

import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for Config.
 *
 * Tests parse from JSON strings directly — no file I/O required.
 */
class ConfigTest {

    private static final String VALID_JSON = """
            {
              "apiKey": "key-abc",
              "serverId": "srv-001",
              "hmacSecret": "super-secret-value",
              "replayWindowSeconds": 600,
              "webhook": {
                "enabled": true,
                "bindPort": 5523,
                "path": "/hyrank/vote"
              },
              "votifierV2": {
                "enabled": false,
                "bindPort": 8192,
                "token": ""
              },
              "rewards": [
                {
                  "trigger": "vote",
                  "commands": ["give {player} diamond 1"],
                  "cooldownSeconds": 86400
                }
              ]
            }
            """;

    @Test
    void parsesValidConfig() throws IOException {
        Config config = Config.fromJson(VALID_JSON);

        assertEquals("key-abc", config.apiKey);
        assertEquals("srv-001", config.serverId);
        assertEquals("super-secret-value", config.hmacSecret);
        assertEquals(600, config.replayWindowSeconds);

        assertNotNull(config.webhook);
        assertTrue(config.webhook.enabled);
        assertEquals(5523, config.webhook.bindPort);
        assertEquals("/hyrank/vote", config.webhook.path);

        assertFalse(config.votifierV2.enabled);

        assertEquals(1, config.rewards.size());
        Config.RewardRule rule = config.rewards.get(0);
        assertEquals("vote", rule.trigger);
        assertEquals(1, rule.commands.size());
        assertEquals("give {player} diamond 1", rule.commands.get(0));
        assertEquals(86400, rule.cooldownSeconds);
    }

    @Test
    void isConfiguredReturnsTrueWhenSecretPresent() throws IOException {
        Config config = Config.fromJson(VALID_JSON);
        assertTrue(config.isConfigured());
    }

    @Test
    void isConfiguredReturnsFalseWhenSecretBlank() throws IOException {
        String json = VALID_JSON.replace("super-secret-value", "");
        Config config = Config.fromJson(json);
        assertFalse(config.isConfigured());
    }

    @Test
    void isConfiguredReturnsFalseWhenWebhookDisabled() throws IOException {
        String json = VALID_JSON.replace("\"enabled\": true", "\"enabled\": false");
        Config config = Config.fromJson(json);
        assertFalse(config.isConfigured());
    }

    @Test
    void rejectsInvalidJson() {
        assertThrows(IOException.class, () -> Config.fromJson("not json at all { broken"));
    }

    @Test
    void unknownFieldsAreIgnored() throws IOException {
        String json = VALID_JSON.replace(
                "\"apiKey\": \"key-abc\"",
                "\"apiKey\": \"key-abc\", \"unknownField\": 42");
        // Should not throw
        Config config = Config.fromJson(json);
        assertEquals("key-abc", config.apiKey);
    }

    @Test
    void defaultsAppliedWhenFieldsMissing() throws IOException {
        // Minimal config — only the outer object
        Config config = Config.fromJson("{}");
        assertEquals("", config.apiKey);
        assertEquals(300, config.replayWindowSeconds);
        assertNotNull(config.webhook);
        assertNotNull(config.votifierV2);
        assertNotNull(config.rewards);
    }
}
