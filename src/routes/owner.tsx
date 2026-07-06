import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { OwnerShell, useActiveRestaurant } from "@/components/OwnerShell";
import { fetchOwnerOrders, type OwnerOrder } from "@/lib/owner-api";
import { IndianRupee, ShoppingBag, Clock, TrendingUp, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/owner")({
  head: () => ({ meta: [{ title: "Owner Dashboard – QuickBite" }] }),
  component: () => (
    <OwnerShell>
      <Dashboard />
    </OwnerShell>
  ),
});

function Dashboard() {
  const [rid] = useActiveRestaurant();
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    fetchOwnerOrders(rid, { since }).then((rows) => {
      setOrders(rows);
      setLoading(false);
    });
  }, [rid]);

  const stats = useMemo(() => {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const today = orders.filter((o) => new Date(o.placed_at) >= startToday);
    const revenue = today.reduce((s, o) => s + Number(o.total), 0);
    const pending = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
    const avg = today.length ? Math.round(revenue / today.length) : 0;
    return { count: today.length, revenue, pending, avg };
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const o of orders) groups[o.status] = (groups[o.status] || 0) + 1;
    return groups;
  }, [orders]);

  const sparkline = useMemo(() => {
    const days: number[] = new Array(7).fill(0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (const o of orders) {
      const d = new Date(o.placed_at); d.setHours(0, 0, 0, 0);
      const diff = Math.floor((now.getTime() - d.getTime()) / (24 * 3600_000));
      if (diff >= 0 && diff < 7) days[6 - diff] += Number(o.total);
    }
    return days;
  }, [orders]);

  const topItems = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      for (const it of o.items || []) {
        const key = it.name;
        const cur = map.get(key) || { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.price * it.qty;
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading dashboard…</div>;

  const max = Math.max(...sparkline, 1);
  const points = sparkline.map((v, i) => `${(i / 6) * 100},${40 - (v / max) * 36}`).join(" ");

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Today's revenue" value={`₹${stats.revenue}`} icon={IndianRupee} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Today's orders" value={stats.count} icon={ShoppingBag} gradient="from-violet-500 to-pink-500" />
        <StatCard label="Avg order value" value={`₹${stats.avg}`} icon={TrendingUp} gradient="from-amber-500 to-orange-500" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} gradient="from-sky-500 to-blue-500" />
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Order status (last 7 days)</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["preparing", "out_for_delivery", "delivered", "cancelled"] as const).map((s) => (
            <div key={s} className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              {labelForStatus(s)}: <span className="text-violet-600">{statusBreakdown[s] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue sparkline */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">Revenue · last 7 days</h3>
          <Link to="/owner/analytics" className="text-xs font-semibold text-violet-600 flex items-center gap-1">
            Full analytics <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <svg viewBox="0 0 100 44" className="w-full h-24 mt-3">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={`0,44 ${points} 100,44`} fill="url(#grad)" stroke="none" />
          <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          {["6d", "5d", "4d", "3d", "2d", "1d", "Today"].map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>

      {/* Top items */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Top selling items</h3>
        {topItems.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">No orders yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {topItems.map((it, i) => (
              <div key={it.name} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-black">{i + 1}</div>
                <p className="flex-1 text-sm font-semibold text-slate-800 truncate">{it.name}</p>
                <p className="text-xs text-slate-500">{it.qty} sold</p>
                <p className="text-sm font-black text-emerald-600">₹{it.revenue}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, gradient }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function labelForStatus(s: string) {
  return ({ preparing: "Preparing", out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled" } as any)[s] || s;
}
