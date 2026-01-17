import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// Type definitions
interface ReviewProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface ReviewRow {
  id: string;
  rating: number;
  content: string;
  helpful_count: number | null;
  owner_response: string | null;
  owner_response_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: ReviewProfile | null;
}

// GET - Fetch reviews for a server
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = (page - 1) * limit;

    const adminSupabase = createAdminSupabaseClient();

    // Return empty reviews if Supabase is not configured
    if (!adminSupabase) {
      return NextResponse.json({
        reviews: [],
        totalCount: 0,
        page,
        limit,
        hasMore: false,
      });
    }

    // Get reviews with user profiles
    type ReviewsQuery = {
      from: (table: string) => {
        select: (query: string, options?: { count: string }) => {
          eq: (col: string, val: string | boolean) => {
            eq: (col: string, val: string | boolean) => {
              order: (col: string, opts: { ascending: boolean }) => {
                range: (start: number, end: number) => Promise<{ data: ReviewRow[] | null; error: Error | null; count: number | null }>
              }
            }
          }
        }
      }
    };
    const reviewsSupabase = adminSupabase as unknown as ReviewsQuery;
    const { data: reviews, error, count } = await reviewsSupabase
      .from("reviews")
      .select(`
        id,
        rating,
        content,
        helpful_count,
        owner_response,
        owner_response_at,
        created_at,
        updated_at,
        profiles!inner (
          id,
          username,
          avatar_url
        )
      `, { count: "exact" })
      .eq("server_id", serverId)
      .eq("reported", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    // Transform the data to match our interface
    const transformedReviews = reviews?.map((review) => ({
      id: review.id,
      userId: review.profiles?.id,
      username: review.profiles?.username || "Anonymous",
      avatar: review.profiles?.avatar_url,
      rating: review.rating,
      content: review.content,
      helpfulCount: review.helpful_count || 0,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      ownerResponse: review.owner_response
        ? {
            content: review.owner_response,
            timestamp: review.owner_response_at,
          }
        : undefined,
    }));

    return NextResponse.json({
      reviews: transformedReviews || [],
      totalCount: count || 0,
      page,
      limit,
      hasMore: offset + limit < (count || 0),
    });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create or update a review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Check if Supabase is configured
    if (!supabase || !adminSupabase) {
      return NextResponse.json(
        { error: "Database not configured", message: "Reviews require database configuration" },
        { status: 503 }
      );
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, content } = body;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!content || content.length < 10 || content.length > 1000) {
      return NextResponse.json(
        { error: "Review must be between 10 and 1000 characters" },
        { status: 400 }
      );
    }

    // Type definitions for queries
    type SingleQuery = {
      from: (table: string) => {
        select: (query: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: { id: string } | null; error: Error | null }>
          }
        }
      }
    };
    type DoubleEqSingleQuery = {
      from: (table: string) => {
        select: (query: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{ data: { id: string } | null; error: Error | null }>
            }
          }
        }
      }
    };
    type UpdateQuery = {
      from: (table: string) => {
        update: (data: Record<string, string | number>) => {
          eq: (col: string, val: string) => {
            select: (query: string) => {
              single: () => Promise<{ data: { id: string } | null; error: Error | null }>
            }
          }
        }
      }
    };
    type InsertQuery = {
      from: (table: string) => {
        insert: (data: Record<string, string | number>) => {
          select: (query: string) => {
            single: () => Promise<{ data: { id: string } | null; error: Error | null }>
          }
        }
      }
    };

    // Check if server exists
    const serverCheckSupabase = adminSupabase as unknown as SingleQuery;
    const { data: server, error: serverError } = await serverCheckSupabase
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

    // Check if user already has a review (upsert)
    const existingCheckSupabase = adminSupabase as unknown as DoubleEqSingleQuery;
    const { data: existingReview } = await existingCheckSupabase
      .from("reviews")
      .select("id")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();

    let review;
    if (existingReview) {
      // Update existing review
      const updateSupabase = adminSupabase as unknown as UpdateQuery;
      const { data, error } = await updateSupabase
        .from("reviews")
        .update({
          rating,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReview.id)
        .select("id")
        .single();

      if (error) {
        console.error("Error updating review:", error);
        return NextResponse.json(
          { error: "Failed to update review" },
          { status: 500 }
        );
      }
      review = data;
    } else {
      // Create new review
      const insertSupabase = adminSupabase as unknown as InsertQuery;
      const { data, error } = await insertSupabase
        .from("reviews")
        .insert({
          server_id: serverId,
          user_id: user.id,
          rating,
          content,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating review:", error);
        return NextResponse.json(
          { error: "Failed to create review" },
          { status: 500 }
        );
      }
      review = data;
    }

    // Update server's average rating
    await updateServerRating(adminSupabase, serverId);

    return NextResponse.json({
      success: true,
      reviewId: review?.id,
      isUpdate: !!existingReview,
    });
  } catch (error) {
    console.error("Review submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to update server's average rating
async function updateServerRating(supabase: ReturnType<typeof createAdminSupabaseClient>, serverId: string) {
  type RatingSelectQuery = {
    from: (table: string) => {
      select: (query: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: boolean) => Promise<{ data: Array<{ rating: number }> | null }>
        }
      }
    }
  };
  const selectSupabase = supabase as unknown as RatingSelectQuery;
  const { data: reviews } = await selectSupabase
    .from("reviews")
    .select("rating")
    .eq("server_id", serverId)
    .eq("reported", false);

  if (reviews && reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    type UpdateQuery = {
      from: (table: string) => {
        update: (data: Record<string, number>) => {
          eq: (col: string, val: string) => Promise<{ error: Error | null }>
        }
      }
    };
    const updateSupabase = supabase as unknown as UpdateQuery;
    await updateSupabase
      .from("servers")
      .update({
        rating_avg: Math.round(avgRating * 10) / 10,
        rating_count: reviews.length,
      })
      .eq("id", serverId);
  }
}
