import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { OwnerShell, useActiveRestaurant } from "@/components/OwnerShell";
import { fetchOwnerOrders, updateOrderStatus } from "@/lib/owner-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, Bike, XCircle, ChevronRight } from "lucide-react";
export const Route = createFileRoute("/owner/orders")({
    head: () => ({ meta: [{ title: "Orders – Owner" }] }),
    component: () => (<OwnerShell>
      <OwnerOrdersPage />
    </OwnerShell>),
});
const FLOW = ["preparing", "out_for_delivery", "delivered"];
function OwnerOrdersPage() {
    const [rid] = useActiveRestaurant();
    const [orders, setOrders] = useState([]);
    const [tab, setTab] = useState("active");
    const seenIds = useRef(new Set());
    const [busy, setBusy] = useState(null);
    async function load() {
        if (!rid)
            return;
        const rows = await fetchOwnerOrders(rid);
        setOrders(rows);
        seenIds.current = new Set(rows.map((r) => r.id));
    }
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [rid]);
    // Realtime new orders + updates
    useEffect(() => {
        if (!rid)
            return;
        const channel = supabase
            .channel(`owner-orders-${rid}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${rid}` }, (payload) => {
            const row = payload.new;
            if (seenIds.current.has(row.id))
                return;
            seenIds.current.add(row.id);
            setOrders((cur) => [row, ...cur]);
            toast.success(`🔔 New order · ₹${row.total}`, { duration: 6000 });
            try {
                // small chime
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.frequency.value = 880;
                g.gain.value = 0.05;
                o.connect(g);
                g.connect(ctx.destination);
                o.start();
                o.stop(ctx.currentTime + 0.2);
            }
            catch { }
        })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${rid}` }, (payload) => {
            const row = payload.new;
            setOrders((cur) => cur.map((o) => (o.id === row.id ? { ...o, ...row } : o)));
        })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [rid]);
    const shown = useMemo(() => {
        if (tab === "all")
            return orders;
        if (tab === "completed")
            return orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
        return orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    }, [orders, tab]);
    async function advance(o) {
        const idx = FLOW.indexOf(o.status);
        const next = idx < 0 ? FLOW[0] : FLOW[Math.min(idx + 1, FLOW.length - 1)];
        setBusy(o.id);
        try {
            await updateOrderStatus(o.id, next);
            setOrders((cur) => cur.map((x) => (x.id === o.id ? { ...x, status: next } : x)));
            toast.success(`Order → ${labelFor(next)}`);
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setBusy(null);
        }
    }
    async function cancel(o) {
        if (!confirm("Cancel this order?"))
            return;
        setBusy(o.id);
        try {
            await updateOrderStatus(o.id, "cancelled");
            setOrders((cur) => cur.map((x) => (x.id === o.id ? { ...x, status: "cancelled" } : x)));
            toast("Order cancelled");
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setBusy(null);
        }
    }
    return (<div className="space-y-4">
      <div className="flex gap-1 bg-white rounded-2xl p-1 w-fit shadow-sm">
        {["active", "completed", "all"].map((t) => (<button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize ${tab === t ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "text-slate-500"}`}>
            {t}
          </button>))}
      </div>

      {shown.length === 0 ? (<div className="text-center py-16 text-slate-400 text-sm">
          {tab === "active" ? "No active orders. New orders appear here live." : "Nothing here."}
        </div>) : (<div className="space-y-2">
          {shown.map((o) => (<div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusPill status={o.status}/>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {o.payment_status === "paid" ? "PAID" : "COD"}
                    </span>
                    <span className="text-[10px] text-slate-400">{timeAgo(o.placed_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 truncate">#{o.id.slice(0, 8)} · {(o.items || []).length} items · {o.payment_method}</p>
                </div>
                <p className="text-lg font-black text-slate-900">₹{Number(o.total)}</p>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {(o.items || []).map((it, i) => (<span key={i} className="text-[11px] bg-slate-100 rounded-full px-2 py-0.5 text-slate-700">
                    {it.qty}× {it.name}
                  </span>))}
              </div>

              {!["delivered", "cancelled"].includes(o.status) && (<div className="mt-3 flex gap-2">
                  <button disabled={busy === o.id} onClick={() => advance(o)} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60">
                    {nextLabel(o.status)} <ChevronRight className="w-3 h-3"/>
                  </button>
                  <button disabled={busy === o.id} onClick={() => cancel(o)} className="h-10 px-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold disabled:opacity-60">
                    Cancel
                  </button>
                </div>)}
            </div>))}
        </div>)}
    </div>);
}
function StatusPill({ status }) {
    const map = {
        preparing: { c: "bg-amber-100 text-amber-700", Icon: Clock },
        out_for_delivery: { c: "bg-sky-100 text-sky-700", Icon: Bike },
        delivered: { c: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
        cancelled: { c: "bg-rose-100 text-rose-700", Icon: XCircle },
    };
    const m = map[status] ?? map.preparing;
    return (<span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.c}`}>
      <m.Icon className="w-3 h-3"/> {labelFor(status)}
    </span>);
}
function labelFor(s) {
    return { preparing: "Preparing", out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled" }[s] || s;
}
function nextLabel(s) {
    const idx = FLOW.indexOf(s);
    const next = idx < 0 ? FLOW[0] : FLOW[Math.min(idx + 1, FLOW.length - 1)];
    return `Mark as ${labelFor(next)}`;
}
function timeAgo(iso) {
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (diff < 1)
        return "just now";
    if (diff < 60)
        return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24)
        return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
