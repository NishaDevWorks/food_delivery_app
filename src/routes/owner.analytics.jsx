import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { OwnerShell, useActiveRestaurant } from "@/components/OwnerShell";
import { fetchOwnerOrders } from "@/lib/owner-api";
export const Route = createFileRoute("/owner/analytics")({
    head: () => ({ meta: [{ title: "Analytics – Owner" }] }),
    component: () => (<OwnerShell>
      <AnalyticsPage />
    </OwnerShell>),
});
function AnalyticsPage() {
    const [rid] = useActiveRestaurant();
    const [orders, setOrders] = useState([]);
    const [range, setRange] = useState(30);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!rid)
            return;
        setLoading(true);
        const since = new Date(Date.now() - range * 24 * 3600_000).toISOString();
        fetchOwnerOrders(rid, { since }).then((r) => { setOrders(r); setLoading(false); });
    }, [rid, range]);
    const days = useMemo(() => {
        const arr = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        for (let i = range - 1; i >= 0; i--) {
            const day = new Date(now.getTime() - i * 24 * 3600_000);
            arr.push({ d: day.toISOString().slice(5, 10), revenue: 0, orders: 0 });
        }
        for (const o of orders) {
            const day = new Date(o.placed_at);
            day.setHours(0, 0, 0, 0);
            const idx = arr.findIndex((a) => a.d === day.toISOString().slice(5, 10));
            if (idx >= 0) {
                arr[idx].revenue += Number(o.total);
                arr[idx].orders += 1;
            }
        }
        return arr;
    }, [orders, range]);
    const totalRev = days.reduce((s, d) => s + d.revenue, 0);
    const totalOrd = days.reduce((s, d) => s + d.orders, 0);
    const maxRev = Math.max(...days.map((d) => d.revenue), 1);
    const bestItems = useMemo(() => {
        const map = new Map();
        for (const o of orders)
            for (const it of o.items || []) {
                const c = map.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
                c.qty += it.qty;
                c.revenue += it.price * it.qty;
                map.set(it.name, c);
            }
        return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }, [orders]);
    const peakHours = useMemo(() => {
        const hrs = new Array(24).fill(0);
        for (const o of orders)
            hrs[new Date(o.placed_at).getHours()] += 1;
        const max = Math.max(...hrs, 1);
        return { hrs, max };
    }, [orders]);
    if (loading)
        return <div className="text-center py-20 text-slate-400">Loading…</div>;
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm">
          {[7, 30, 90].map((r) => (<button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${range === r ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "text-slate-500"}`}>
              {r}d
            </button>))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi label="Total revenue" value={`₹${totalRev.toLocaleString()}`}/>
        <Kpi label="Total orders" value={totalOrd}/>
        <Kpi label="Avg order value" value={`₹${totalOrd ? Math.round(totalRev / totalOrd) : 0}`}/>
      </div>

      {/* Revenue bar chart */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Revenue trend</h3>
        <div className="mt-4 flex items-end gap-1 h-40">
          {days.map((d, i) => (<div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.d}: ₹${d.revenue}`}>
              <div className="w-full rounded-t bg-gradient-to-t from-violet-500 to-pink-400" style={{ height: `${(d.revenue / maxRev) * 100}%`, minHeight: d.revenue > 0 ? "2px" : "0" }}/>
            </div>))}
        </div>
        {range <= 30 && (<div className="mt-1 flex gap-1 text-[9px] text-slate-400">
            {days.map((d, i) => <div key={i} className="flex-1 text-center">{i % 3 === 0 ? d.d : ""}</div>)}
          </div>)}
      </div>

      {/* Peak hours */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Peak ordering hours</h3>
        <div className="mt-3 grid grid-cols-24 gap-0.5" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
          {peakHours.hrs.map((v, i) => (<div key={i} title={`${i}:00 · ${v} orders`} className="h-8 rounded" style={{
                background: v ? `rgba(139, 92, 246, ${0.15 + 0.85 * (v / peakHours.max)})` : "#f1f5f9",
            }}/>))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-slate-400">
          <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
        </div>
      </div>

      {/* Best items */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Best selling items</h3>
        {bestItems.length === 0 ? (<p className="mt-3 text-xs text-slate-400">No sales in this range.</p>) : (<div className="mt-3 space-y-2">
            {bestItems.map((it, i) => (<div key={it.name} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-black">{i + 1}</div>
                <p className="flex-1 text-sm font-semibold text-slate-800 truncate">{it.name}</p>
                <p className="text-xs text-slate-500">{it.qty} sold</p>
                <p className="text-sm font-black text-emerald-600 w-20 text-right">₹{it.revenue}</p>
              </div>))}
          </div>)}
      </div>
    </div>);
}
function Kpi({ label, value }) {
    return (<div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
    </div>);
}
