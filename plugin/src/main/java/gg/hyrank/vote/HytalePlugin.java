package gg.hyrank.vote;

/**
 * Minimal stub interface for the Hytale plugin lifecycle.
 *
 * TODO: Replace with the real interface from the official Hytale plugin SDK
 * once it is publicly released (Britakee GitBook reference).
 *
 * The real interface will likely be in a package such as
 * {@code net.hytale.api.plugin.HytalePlugin} and will provide additional
 * lifecycle hooks (onLoad, onWorldReady, etc.) and injected server handles.
 */
public interface HytalePlugin {
    /** Called by the plugin runtime after the server has started. */
    void onEnable();

    /** Called by the plugin runtime before the server shuts down. */
    void onDisable();
}
