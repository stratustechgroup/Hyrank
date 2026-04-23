import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/servers/[id]/owner-status
 *
 * Returns whether the currently-authenticated user is the verified owner of
 * this server.  Used by OwnerClaimWizard to poll after adding the MOTD token.
 *
 * Response shape: { isOwner: boolean, claimed: boolean }
 *   isOwner  – true when servers.owner_id === auth.uid()
 *   claimed  – true when servers.trust_tier === 'claimed'
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: serverId } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: server, error } = await supabase
    .from("servers")
    .select("owner_id, trust_tier")
    .eq("id", serverId)
    .single();

  if (error || !server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const isOwner = server.owner_id === user.id;
  const claimed = server.trust_tier === "claimed";

  return NextResponse.json({ isOwner, claimed });
}
