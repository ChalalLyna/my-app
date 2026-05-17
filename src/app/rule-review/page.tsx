"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import { RuleReview, ReviewStatus } from "@/app/data/ruleReviews";
import {
  ClipboardCheck, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw, Code2, User, Loader2,
  MessageSquare, Shield,
} from "lucide-react";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ReviewStatus, { text: string; bg: string; border: string; label: string }> = {
  pending:  { text: "text-amber-400",   bg: "bg-amber-900/20",   border: "border-amber-800/50",  label: "Pending"  },
  approved: { text: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-800/50", label: "Approved" },
  rejected: { text: "text-red-400",     bg: "bg-red-900/20",     border: "border-red-800/50",     label: "Rejected" },
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${s.text} ${s.bg} ${s.border}`}>
      {s.label}
    </span>
  );
}

function ActionBadge({ action }: { action: "create" | "modify" }) {
  return action === "create"
    ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand/10 border border-brand/30 text-brand">New rule</span>
    : <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-900/20 border border-indigo-800/40 text-indigo-400">Modified</span>;
}

// ─── XML preview ──────────────────────────────────────────────────────────────

function XmlPreview({ xml }: { xml: string }) {
  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800/60 p-4 overflow-auto max-h-64">
      <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{xml}</pre>
    </div>
  );
}

// ─── Review action modal ──────────────────────────────────────────────────────

interface ReviewModalProps {
  review: RuleReview;
  action: "approve" | "reject";
  onConfirm: (comment: string) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}

function ReviewActionModal({ review, action, onConfirm, onCancel, submitting, error }: ReviewModalProps) {
  const [comment, setComment] = useState("");
  const isApprove = action === "approve";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-950 border border-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isApprove ? "bg-emerald-600/15" : "bg-red-600/15"}`}>
            {isApprove
              ? <CheckCircle size={18} className="text-emerald-400" />
              : <XCircle    size={18} className="text-red-400" />
            }
          </div>
          <div>
            <h3 className="text-white font-bold">{isApprove ? "Approve rule" : "Reject rule"}</h3>
            <p className="text-gray-500 text-xs mt-0.5 font-mono">{review.ruleName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Comment {isApprove ? "(optional)" : "(recommended)"}
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder={isApprove
              ? "Leave feedback for the student..."
              : "Explain what needs to be fixed..."}
            className="bg-gray-800/60 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-red-900/20 border border-red-800/40 rounded-xl mb-4">
            <AlertTriangle size={12} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(comment)}
            disabled={submitting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 ${
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-red-700 hover:bg-red-600 text-white"
            }`}
          >
            {submitting
              ? <Loader2 size={14} className="animate-spin" />
              : isApprove ? <CheckCircle size={14} /> : <XCircle size={14} />
            }
            {submitting ? "Saving..." : isApprove ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review row ───────────────────────────────────────────────────────────────

interface ReviewRowProps {
  review: RuleReview;
  onApprove: () => void;
  onReject: () => void;
}

function ReviewRow({ review, onApprove, onReject }: ReviewRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isPending = review.status === "pending";

  return (
    <div className="border-b border-gray-800/40 last:border-0">
      <div
        className="flex items-center gap-3 px-5 py-4 hover:bg-gray-800/20 transition-colors cursor-pointer group"
        onClick={() => setExpanded(v => !v)}
      >
        <button
          className="shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{review.ruleName}</span>
            <ActionBadge action={review.action} />
            <StatusBadge status={review.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User size={10} />
              {review.submittedBy}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {new Date(review.submittedAt).toLocaleString("en-US")}
            </span>
            <span className="font-mono text-gray-600">{review.filename}</span>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}>
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/40 text-xs font-medium transition-all"
            >
              <XCircle size={12} />
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/40 text-xs font-medium transition-all"
            >
              <CheckCircle size={12} />
              Approve
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-5 pb-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Code2 size={12} className="text-gray-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">XML Content</span>
          </div>
          <XmlPreview xml={review.xml} />

          {!isPending && review.reviewedBy && (
            <div className={`flex items-start gap-3 p-3 rounded-xl border ${
              review.status === "approved"
                ? "bg-emerald-900/10 border-emerald-800/30"
                : "bg-red-900/10 border-red-800/30"
            }`}>
              <MessageSquare size={13} className={review.status === "approved" ? "text-emerald-400 shrink-0 mt-0.5" : "text-red-400 shrink-0 mt-0.5"} />
              <div className="flex flex-col gap-0.5">
                <span className={`text-xs font-semibold ${review.status === "approved" ? "text-emerald-400" : "text-red-400"}`}>
                  {review.status === "approved" ? "Approved" : "Rejected"} by {review.reviewedBy}
                  <span className="text-gray-600 font-normal ml-2">
                    {review.reviewedAt ? new Date(review.reviewedAt).toLocaleString("en-US") : ""}
                  </span>
                </span>
                {review.comment && (
                  <p className="text-xs text-gray-400 mt-0.5">{review.comment}</p>
                )}
              </div>
            </div>
          )}

          {isPending && (
            <div className="flex gap-2 mt-1">
              <button
                onClick={onReject}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/40 text-sm font-medium transition-all"
              >
                <XCircle size={14} />
                Reject
              </button>
              <button
                onClick={onApprove}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/40 text-sm font-medium transition-all"
              >
                <CheckCircle size={14} />
                Approve
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RuleReviewPage() {
  const { user } = useAuth();

  const [reviews,      setReviews]      = useState<RuleReview[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [filter,       setFilter]       = useState<ReviewStatus | "all">("all");
  const [modalTarget,  setModalTarget]  = useState<{ review: RuleReview; action: "approve" | "reject" } | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  const canReview = user?.role === "consultant" || user?.role === "admin";

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res  = await fetch("/api/rule-reviews", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setReviews(data);
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleReview = async (comment: string) => {
    if (!modalTarget) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/rule-reviews/${modalTarget.review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: modalTarget.action === "approve" ? "approved" : "rejected",
          comment: comment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setReviews(prev => prev.map(r => r.id === data.id ? data : r));
      setModalTarget(null);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount  = reviews.filter(r => r.status === "pending").length;
  const approvedCount = reviews.filter(r => r.status === "approved").length;
  const rejectedCount = reviews.filter(r => r.status === "rejected").length;

  const filtered = filter === "all" ? reviews : reviews.filter(r => r.status === filter);

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col min-h-[calc(100vh-3.5rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <ClipboardCheck size={20} className="text-brand" />
              Rule Review
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Review and validate detection rules submitted by students
            </p>
          </div>
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-white hover:bg-gray-700 text-sm font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",    value: reviews.length, color: "text-white",       border: "border-gray-800"        },
            { label: "Pending",  value: pendingCount,   color: "text-amber-400",   border: "border-amber-900/40"   },
            { label: "Approved", value: approvedCount,  color: "text-emerald-400", border: "border-emerald-900/40" },
            { label: "Rejected", value: rejectedCount,  color: "text-red-400",     border: "border-red-900/40"     },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden flex-1 flex flex-col">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60 shrink-0">
            <div className="flex gap-1.5">
              {(["all", "pending", "approved", "rejected"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    filter === f
                      ? f === "all"      ? "bg-brand text-white"
                      : f === "pending"  ? "bg-amber-900/30 text-amber-400 border border-amber-800/50"
                      : f === "approved" ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50"
                      :                    "bg-red-900/30 text-red-400 border border-red-800/50"
                      : "bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-800"
                  }`}
                >
                  {f === "all" ? `All (${reviews.length})` : f === "pending" ? `Pending (${pendingCount})` : f === "approved" ? `Approved (${approvedCount})` : `Rejected (${rejectedCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading reviews...</span>
              </div>
            ) : apiError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertTriangle size={28} className="text-red-500/60" />
                <p className="text-sm text-red-400">Error: {apiError}</p>
                <button onClick={fetchReviews} className="text-xs text-gray-400 hover:text-white underline">
                  Retry
                </button>
              </div>
            ) : !canReview ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
                <Shield size={32} className="text-gray-700" />
                <p className="text-sm">Only consultants can review rules.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
                <ClipboardCheck size={32} className="text-gray-700" />
                <p className="text-sm">No submissions matching this filter.</p>
              </div>
            ) : (
              filtered.map(review => (
                <ReviewRow
                  key={review.id}
                  review={review}
                  onApprove={() => { setSubmitError(null); setModalTarget({ review, action: "approve" }); }}
                  onReject={()  => { setSubmitError(null); setModalTarget({ review, action: "reject"  }); }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {modalTarget && (
        <ReviewActionModal
          review={modalTarget.review}
          action={modalTarget.action}
          onConfirm={handleReview}
          onCancel={() => setModalTarget(null)}
          submitting={submitting}
          error={submitError}
        />
      )}
    </DashboardLayout>
  );
}
