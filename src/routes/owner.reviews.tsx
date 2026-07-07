import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { OwnerShell, useActiveRestaurant } from "@/components/OwnerShell";
import { fetchAllReviewsForOwner, replyToReview, setReviewStatus, type CloudReview } from "@/lib/reviews-cloud";
import { supabase } from "@/integrations/supabase/client";
import { Star, Archive, Reply, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/owner/reviews")({
  head: () => ({ meta: [{ title: "Reviews – Owner" }] }),
  component: () => (<OwnerShell><ReviewsInbox /></OwnerShell>),
});

function ReviewsInbox() {
  const [rid] = useActiveRestaurant();
  const [rows, setRows] = useState<CloudReview[]>([]);
  const [tab, setTab] = useState<"all" | "new" | "replied" | "archived">("new");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!rid) return;
    setRows(await fetchAllReviewsForOwner(rid));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [rid]);

  useEffect(() => {
    if (!rid) return;
    const ch = supabase
      .channel(`owner-reviews-${rid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews", filter: `restaurant_id=eq.${rid}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [rid]);

  const shown = useMemo(() => {
    let list = rows;
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    if (starFilter) list = list.filter((r) => r.rating === starFilter);
    return list;
  }, [rows, tab, starFilter]);

  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    replied: rows.filter((r) => r.status === "replied").length,
    archived: rows.filter((r) => r.status === "archived").length,
  };

  async function reply(r: CloudReview) {
    const text = drafts[r.id]?.trim();
    if (!text) return toast.error("Type a reply first");
    setBusy(r.id);
    try {
      await replyToReview(r.id, text);
      setDrafts((d) => ({ ...d, [r.id]: "" }));
      toast.success("Reply sent");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  async function archive(r: CloudReview) {
    setBusy(r.id);
    try { await setReviewStatus(r.id, r.status === "archived" ? "new" : "archived"); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm">
          {(["new", "replied", "archived", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${tab === t ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "text-slate-500"}`}
            >
              {t}{t !== "all" && counts[t] > 0 ? ` · ${counts[t]}` : ""}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm">
          <button onClick={() => setStarFilter(null)} className={`px-2 py-1 rounded-lg text-xs font-bold ${starFilter === null ? "bg-violet-100 text-violet-700" : "text-slate-500"}`}>All ★</button>
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              onClick={() => setStarFilter(n === starFilter ? null : n)}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center ${starFilter === n ? "bg-amber-100 text-amber-700" : "text-slate-500"}`}
            >
              {n}<Star className="w-3 h-3 ml-0.5" />
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center">
          <MessageSquare className="w-8 h-8 mb-2" /> No reviews here.
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-900">{r.author || "Customer"}</p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-3 h-3 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      r.status === "new" ? "bg-violet-100 text-violet-700" :
                      r.status === "replied" ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-200 text-slate-600"
                    }`}>{r.status.toUpperCase()}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => archive(r)}
                  disabled={busy === r.id}
                  className="text-slate-400 hover:text-slate-700"
                  title={r.status === "archived" ? "Restore" : "Archive"}
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}

              {r.reply ? (
                <div className="mt-3 bg-violet-50 border-l-2 border-violet-400 p-2 rounded">
                  <p className="text-[10px] font-bold text-violet-700 uppercase">Your reply</p>
                  <p className="text-sm text-slate-700 mt-0.5">{r.reply}</p>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="Write a reply…"
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <button
                    onClick={() => reply(r)}
                    disabled={busy === r.id}
                    className="px-3 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                  >
                    <Reply className="w-3 h-3" /> Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
