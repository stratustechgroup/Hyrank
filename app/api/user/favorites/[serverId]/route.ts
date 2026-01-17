import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// Type definitions for Supabase queries
type SingleSelectQuery = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { id: string } | null; error?: Error | null }>
        }
      }
    }
  }
};

type ServerSelectQuery = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: { id: string } | null; error: Error | null }>
      }
    }
  }
};

type InsertQuery = {
  from: (table: string) => {
    insert: (data: Record<string, string>) => Promise<{ error: Error | null }>
  }
};

type DeleteQuery = {
  from: (table: string) => {
    delete: () => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => Promise<{ error: Error | null }>
      }
    }
  }
};

// GET - Check if a server is saved
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ isSaved: false });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ isSaved: false });
    }

    const adminSupabase = createAdminSupabaseClient();
    if (!adminSupabase) {
      return NextResponse.json({ isSaved: false });
    }

    const selectSupabase = adminSupabase as unknown as SingleSelectQuery;
    const { data: savedServer } = await selectSupabase
      .from("saved_servers")
      .select("id")
      .eq("user_id", user.id)
      .eq("server_id", serverId)
      .single();

    return NextResponse.json({ isSaved: !!savedServer });
  } catch (error) {
    console.error("Error checking saved status:", error);
    return NextResponse.json({ isSaved: false });
  }
}

// POST - Save a server
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Authentication not configured" },
        { status: 503 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    // Check if server exists
    const serverSupabase = adminSupabase as unknown as ServerSelectQuery;
    const { data: server, error: serverError } = await serverSupabase
      .from("servers")
      .select("id")
      .eq("id", serverId)
      .single();

    if (serverError || !server) {
      return NextResponse.json(
        { error: "Server not found" },
        { status: 404 }
      );
    }

    // Check if already saved
    const selectSupabase = adminSupabase as unknown as SingleSelectQuery;
    const { data: existingSave } = await selectSupabase
      .from("saved_servers")
      .select("id")
      .eq("user_id", user.id)
      .eq("server_id", serverId)
      .single();

    if (existingSave) {
      return NextResponse.json({ success: true, message: "Already saved" });
    }

    // Save the server
    const insertSupabase = adminSupabase as unknown as InsertQuery;
    const { error: saveError } = await insertSupabase
      .from("saved_servers")
      .insert({
        user_id: user.id,
        server_id: serverId,
      });

    if (saveError) {
      console.error("Error saving server:", saveError);
      return NextResponse.json(
        { error: "Failed to save server" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving server:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a saved server
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Authentication not configured" },
        { status: 503 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    // Remove the saved server
    const deleteSupabase = adminSupabase as unknown as DeleteQuery;
    const { error: deleteError } = await deleteSupabase
      .from("saved_servers")
      .delete()
      .eq("user_id", user.id)
      .eq("server_id", serverId);

    if (deleteError) {
      console.error("Error removing saved server:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove saved server" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing saved server:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
