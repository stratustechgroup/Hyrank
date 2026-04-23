import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: serverId } = await params;

  // Require authenticated user
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Parse body
  let method: "motd" | "ingame" = "motd";
  try {
    const body = await request.json();
    if (body.method === "ingame") method = "ingame";
  } catch {
    // Default to motd
  }

  // Verify server exists
  const { data: server, error: serverError } = await supabase
    .from("servers")
    .select("id, name, owner_id")
    .eq("id", serverId)
    .single();

  if (serverError || !server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  // If server already has an owner, reject unless this is the same user
  if (server.owner_id && server.owner_id !== user.id) {
    return NextResponse.json({ error: "Server already has a verified owner" }, { status: 409 });
  }

  // Generate a unique verification token
  const tokenBytes = new Uint8Array(8);
  crypto.getRandomValues(tokenBytes);
  const token = `hyrank-verify-${Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  // Check if a pending claim already exists for this user + server
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  }

  const { data: existing } = await admin
    .from("server_owners")
    .select("id, token, status")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    // Return existing pending token rather than creating duplicate
    return NextResponse.json({
      token: existing.token,
      instructions: buildInstructions(existing.token, method),
      status: "existing_pending",
    });
  }

  // Insert new claim
  const { error: insertError } = await admin.from("server_owners").insert({
    server_id: serverId,
    user_id: user.id,
    method,
    token,
    status: "pending",
  });

  if (insertError) {
    console.error("Error creating claim:", insertError);
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  }

  return NextResponse.json({
    token,
    instructions: buildInstructions(token, method),
    status: "created",
  });
}

function buildInstructions(token: string, method: "motd" | "ingame"): string {
  if (method === "motd") {
    return (
      `To verify ownership, add this token to your server's MOTD (message of the day): ` +
      `"${token}". ` +
      `HyRank will automatically detect it during the next server ping (usually within 5 minutes). ` +
      `You can remove it after verification is confirmed.`
    );
  }
  return (
    `To verify ownership via in-game command, run: /hyrank-verify ${token} ` +
    `(requires HyRank Vote Plugin — see documentation for installation). ` +
    `This method will be fully available in a future update.`
  );
}
