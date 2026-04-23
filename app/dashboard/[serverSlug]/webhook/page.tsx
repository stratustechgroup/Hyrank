import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { randomBytes, createHmac } from "crypto";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

interface WebhookServerRow {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string | null;
  votifier_secret_key: string | null;
}

interface PageProps {
  params: Promise<{ serverSlug: string }>;
}

// -------------------------------------------------------------------------
// Server action — generate / rotate the HMAC secret
// -------------------------------------------------------------------------

async function rotateSecret(serverId: string): Promise<string> {
  "use server";

  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Admin client not available");

  const newSecret = randomBytes(32).toString("hex");

  const { error } = await admin
    .from("servers")
    .update({ votifier_secret_key: newSecret })
    .eq("id", serverId);

  if (error) throw new Error("Failed to update secret: " + error.message);
  return newSecret;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function buildConfigJson(server: WebhookServerRow, hmacSecret: string): string {
  const config = {
    apiKey: "",
    serverId: server.id,
    hmacSecret,
    replayWindowSeconds: 300,
    webhook: {
      enabled: true,
      bindPort: 5523,
      path: "/hyrank/vote",
    },
    votifierV2: {
      enabled: false,
      bindPort: 8192,
      token: "",
    },
    rewards: [
      {
        trigger: "vote",
        commands: ["give {player} diamond 1", "broadcast {player} just voted on HyRank!"],
        cooldownSeconds: 86400,
      },
    ],
  };
  return JSON.stringify(config, null, 2);
}

// -------------------------------------------------------------------------
// Page component (Server Component)
// -------------------------------------------------------------------------

export default async function WebhookSettingsPage({ params }: PageProps) {
  const { serverSlug } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/dashboard/${serverSlug}/webhook`);

  // Fetch server by slug, verify ownership
  const { data: serverRow } = await supabase
    .from("servers")
    .select("id, name, slug, owner_id, votifier_secret_key")
    .eq("slug", serverSlug)
    .single<WebhookServerRow>();

  if (!serverRow) notFound();
  if (serverRow.owner_id !== user.id) redirect("/dashboard");

  // If no secret yet, generate one now
  let hmacSecret = serverRow.votifier_secret_key ?? "";
  if (!hmacSecret) {
    try {
      hmacSecret = await rotateSecret(serverRow.id);
    } catch {
      // Non-fatal — page still renders, user can click Rotate
    }
  }

  const configJson = buildConfigJson(serverRow, hmacSecret);
  const configDataUri = `data:application/json;charset=utf-8,${encodeURIComponent(configJson)}`;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-white/40 mb-6">
        <a href="/dashboard" className="hover:text-white/70 transition-colors">Dashboard</a>
        <span className="mx-2">/</span>
        <span className="text-white/70">{serverRow.name}</span>
        <span className="mx-2">/</span>
        <span className="text-white">Vote Plugin</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Vote Plugin Setup</h1>
        <p className="text-white/60">
          Configure the HyRank Vote Plugin to dispatch in-game rewards when players vote.
        </p>
      </div>

      {/* Step 1 — Download JAR */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-adventure-500/20 flex items-center justify-center text-adventure-400 font-bold text-sm shrink-0">
            1
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">Download the Plugin JAR</h2>
            <p className="text-white/50 text-sm mb-4">
              Drop <code className="text-adventure-400">hyrank-vote-plugin-0.1.0.jar</code> into your
              server&apos;s <code className="text-adventure-400">plugins/</code> directory.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/hyrank/hyrank-vote-plugin/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z"/>
                </svg>
                GitHub Releases
              </a>
              <a
                href="https://curseforge.com/hytale/plugins/hyrank-vote-plugin"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
              >
                CurseForge
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 — Download Config */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-adventure-500/20 flex items-center justify-center text-adventure-400 font-bold text-sm shrink-0">
            2
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">Download Your Config</h2>
            <p className="text-white/50 text-sm mb-4">
              This config is pre-filled with your server ID and HMAC secret.
              Place it at <code className="text-adventure-400">mods/HyRank/config.json</code> on your server.
            </p>

            {/* HMAC Secret display */}
            {hmacSecret ? (
              <div className="mb-4">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">HMAC Secret</div>
                <div className="flex items-center gap-2">
                  <code className="text-adventure-400 text-sm font-mono bg-white/5 px-3 py-2 rounded flex-1 overflow-x-auto">
                    {hmacSecret}
                  </code>
                </div>
                <p className="text-white/30 text-xs mt-1">
                  Keep this secret. If it is exposed, use &ldquo;Rotate Secret&rdquo; below.
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                Failed to generate HMAC secret. Click &ldquo;Rotate Secret&rdquo; below to try again.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <a
                href={configDataUri}
                download="config.json"
                className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download config.json
              </a>

              <form action={async () => {
                "use server";
                await rotateSecret(serverRow.id);
                redirect(`/dashboard/${serverSlug}/webhook`);
              }}>
                <button
                  type="submit"
                  className="text-sm px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6"/>
                    <path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Rotate Secret
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 — Restart and verify */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-adventure-500/20 flex items-center justify-center text-adventure-400 font-bold text-sm shrink-0">
            3
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">Restart &amp; Verify</h2>
            <ol className="text-white/60 text-sm space-y-2 list-decimal list-inside">
              <li>Drop the JAR in <code className="text-adventure-400">plugins/</code></li>
              <li>Place <code className="text-adventure-400">config.json</code> at <code className="text-adventure-400">mods/HyRank/config.json</code></li>
              <li>Add your <code className="text-adventure-400">apiKey</code> to the config (from your HyRank API settings)</li>
              <li>Restart the Hytale server</li>
              <li>Cast a test vote — reward should arrive in-game within seconds</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Config preview */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
          Config Preview
        </h2>
        <pre className="text-xs text-adventure-300 bg-black/30 rounded p-4 overflow-x-auto font-mono leading-relaxed">
          {configJson}
        </pre>
        <p className="text-white/30 text-xs mt-3">
          See{" "}
          <a
            href="https://github.com/hyrank/hyrank-vote-plugin/blob/main/docs/config.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-adventure-400 hover:underline"
          >
            config.md
          </a>{" "}
          for full documentation.
        </p>
      </div>
    </div>
  );
}
