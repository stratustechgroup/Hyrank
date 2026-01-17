// Types for our database schema
export interface Database {
  public: {
    Tables: {
      servers: {
        Row: {
          id: string;
          name: string;
          ip: string;
          description: string | null;
          banner: string | null;
          banners: string[] | null;
          icon: string | null;
          motd: string | null;
          tags: string[];
          website: string | null;
          discord: string | null;
          twitter: string | null;
          youtube: string | null;
          owner_id: string | null;
          verified: boolean;
          featured: boolean;
          featured_order: number | null;
          players_online: number;
          players_max: number;
          status: "online" | "offline" | "unknown";
          latency: number | null;
          last_ping: string | null;
          uptime_day: number | null;
          uptime_week: number | null;
          uptime_month: number | null;
          vote_count: number;
          monthly_votes: number;
          weekly_votes: number;
          rating_avg: number;
          rating_count: number;
          view_count: number;
          click_count: number;
          votifier_enabled: boolean;
          votifier_ip: string | null;
          votifier_port: number;
          votifier_public_key: string | null;
          votifier_secret_key: string | null;
          is_premium: boolean;
          ranking_score: number;
          query_port: number;
          country: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["servers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["servers"]["Insert"]>;
      };
      server_status_history: {
        Row: {
          id: string;
          server_id: string;
          players_online: number;
          status: string;
          latency: number | null;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["server_status_history"]["Row"], "id" | "recorded_at">;
        Update: Partial<Database["public"]["Tables"]["server_status_history"]["Insert"]>;
      };
      votes: {
        Row: {
          id: string;
          server_id: string;
          user_id: string | null;
          ip_hash: string;
          visitor_id: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["votes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["votes"]["Insert"]>;
      };
      vote_deliveries: {
        Row: {
          id: string;
          vote_id: string;
          server_id: string;
          username: string;
          status: "pending" | "delivered" | "failed" | "claimed";
          attempts: number;
          last_attempt: string | null;
          next_retry: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vote_deliveries"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vote_deliveries"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          server_id: string;
          user_id: string;
          rating: number;
          content: string | null;
          helpful_count: number;
          reported: boolean;
          owner_response: string | null;
          owner_response_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          email_verified: boolean;
          discord_id: string | null;
          discord_username: string | null;
          hytale_uuid: string | null;
          hytale_username: string | null;
          hytale_verified_at: string | null;
          total_votes: number;
          vote_streak: number;
          longest_streak: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      saved_servers: {
        Row: {
          id: string;
          user_id: string;
          server_id: string;
          saved_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["saved_servers"]["Row"], "id" | "saved_at">;
        Update: Partial<Database["public"]["Tables"]["saved_servers"]["Insert"]>;
      };
      bumps: {
        Row: {
          id: string;
          server_id: string;
          user_id: string | null;
          ip_hash: string;
          is_premium: boolean;
          bumped_at: string;
          expires_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bumps"]["Row"], "id" | "bumped_at">;
        Update: Partial<Database["public"]["Tables"]["bumps"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          tier: "free" | "pro" | "enterprise";
          status: "active" | "canceled" | "past_due";
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["subscriptions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
    };
  };
}
