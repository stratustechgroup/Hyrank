"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/AuthContext";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface Submission {
  id: string;
  name: string;
  ip: string;
  description: string | null;
  banner: string | null;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
  submitter_id: string;
}

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (authLoading) return;

      if (!user) {
        router.push("/login");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        router.push("/");
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);

      // Fetch submissions
      let query = supabase
        .from("server_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching submissions:", error);
      } else {
        setSubmissions(data || []);
      }

      setLoading(false);
    };

    checkAdminAndFetch();
  }, [user, authLoading, router, filter]);

  const handleApprove = async (submission: Submission) => {
    setProcessingId(submission.id);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setProcessingId(null);
      return;
    }

    try {
      // Create the server entry
      const { error: serverError } = await supabase.from("servers").insert({
        name: submission.name,
        ip: submission.ip,
        description: submission.description,
        banner: submission.banner,
        tags: submission.tags,
        owner_id: submission.submitter_id,
        status: "unknown",
        verified: false,
        featured: false,
      });

      if (serverError) {
        console.error("Error creating server:", serverError);
        alert("Failed to create server: " + serverError.message);
        setProcessingId(null);
        return;
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from("server_submissions")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      if (updateError) {
        console.error("Error updating submission:", updateError);
      }

      // Remove from list or update status
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id ? { ...s, status: "approved" as const } : s
        )
      );
    } catch (err) {
      console.error("Error approving submission:", err);
    }

    setProcessingId(null);
  };

  const handleReject = async (submissionId: string) => {
    setProcessingId(submissionId);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setProcessingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("server_submissions")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (error) {
        console.error("Error rejecting submission:", error);
      } else {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId ? { ...s, status: "rejected" as const } : s
          )
        );
      }
    } catch (err) {
      console.error("Error rejecting submission:", err);
    }

    setProcessingId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-hytale-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const filteredSubmissions = filter === "all"
    ? submissions
    : submissions.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Server Submissions</h1>
            <p className="text-white/50">Review and approve server submissions</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["pending", "approved", "rejected", "all"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === status
                  ? "bg-hytale-500 text-white"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredSubmissions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-white/40"
              >
                No {filter === "all" ? "" : filter} submissions found.
              </motion.div>
            ) : (
              filteredSubmissions.map((submission) => (
                <motion.div
                  key={submission.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#12141a] border border-white/10 rounded-xl p-6"
                >
                  <div className="flex gap-6">
                    {/* Banner Preview */}
                    {submission.banner && (
                      <div className="w-48 h-28 rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={submission.banner}
                          alt={submission.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-xl font-semibold">{submission.name}</h3>
                          <p className="text-white/50 font-mono text-sm">{submission.ip}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                            submission.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : submission.status === "approved"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {submission.status}
                        </span>
                      </div>

                      {submission.description && (
                        <p className="text-white/60 text-sm mb-3 line-clamp-2">
                          {submission.description}
                        </p>
                      )}

                      {/* Tags */}
                      {submission.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {submission.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-white/5 text-white/60 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-xs">
                          Submitted {new Date(submission.created_at).toLocaleDateString()}
                        </span>

                        {/* Actions */}
                        {submission.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReject(submission.id)}
                              disabled={processingId === submission.id}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(submission)}
                              disabled={processingId === submission.id}
                              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {processingId === submission.id ? "Processing..." : "Approve"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
