// Re-export types
export * from "./types";

// Re-export client-side utilities (safe for client components)
export { createBrowserSupabaseClient } from "./client";

// Note: Server-side utilities should be imported directly from "./server"
// to avoid bundling next/headers in client code
