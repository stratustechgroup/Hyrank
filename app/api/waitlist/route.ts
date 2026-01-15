import { NextRequest, NextResponse } from "next/server";

const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
const LOOPS_API_URL = "https://app.loops.so/api/v1/contacts/create";

interface WaitlistRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  serverName?: string;
  serverType?: string;
}

export async function POST(request: NextRequest) {
  // Check if API key is configured
  if (!LOOPS_API_KEY) {
    console.error("LOOPS_API_KEY is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body: WaitlistRequest = await request.json();

    // Validate email
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Prepare payload for Loops.so
    const loopsPayload: Record<string, string | boolean> = {
      email: body.email.toLowerCase().trim(),
      source: "hyrank-waitlist",
      subscribed: true,
    };

    // Add optional fields if provided
    if (body.firstName) {
      loopsPayload.firstName = body.firstName.trim();
    }

    if (body.lastName) {
      loopsPayload.lastName = body.lastName.trim();
    }

    if (body.serverName) {
      loopsPayload.serverName = body.serverName.trim();
    }

    if (body.serverType) {
      loopsPayload.serverType = body.serverType;
    }

    // Submit to Loops.so API
    const response = await fetch(LOOPS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOOPS_API_KEY}`,
      },
      body: JSON.stringify(loopsPayload),
    });

    const data = await response.json();

    // Handle Loops.so response
    if (!response.ok) {
      // Check if contact already exists (not an error for waitlist)
      if (response.status === 409 || data.message?.includes("already exists")) {
        return NextResponse.json(
          { success: true, message: "You're already on the waitlist!" },
          { status: 200 }
        );
      }

      console.error("Loops.so API error:", data);
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true, message: "Successfully joined the waitlist!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Waitlist submission error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
