import type { Server } from "./supabase/queries";

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Filter and sort types
export interface ServerFilters {
  tags?: string[];
  verified?: boolean;
  minPlayers?: number;
  maxPlayers?: number;
  search?: string;
  featured?: boolean;
}

export type SortOption = "rank" | "players" | "votes" | "newest" | "name";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: SortOption;
  direction: SortDirection;
}

// API request/response types
export interface ServersQueryParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: SortOption;
  direction?: SortDirection;
  filters?: ServerFilters;
}

export interface ServerCreateRequest {
  name: string;
  ip: string;
  description: string;
  banner: string;
  tags: string[];
  website?: string;
  discord?: string;
}

export interface ServerUpdateRequest extends Partial<ServerCreateRequest> {
  id: string;
}

// Vote types
export interface VoteRequest {
  serverId: string;
}

export interface VoteResponse {
  success: boolean;
  newVoteCount: number;
  message?: string;
}

// Dashboard types
export interface DashboardStats {
  totalViews: number;
  totalVotes: number;
  currentPlayers: number;
  serversOwned: number;
}

export interface ServerWithStats extends Server {
  viewsToday: number;
  viewsWeek: number;
  votesWeek: number;
}

// UI state types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Helper type for server list with loading
export interface ServerListState extends LoadingState {
  servers: Server[];
  hasMore: boolean;
  cursor: string | null;
}
