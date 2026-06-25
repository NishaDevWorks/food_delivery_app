import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Package, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { loadOrders, type Order } from "@/lib/orders";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Order history – QuickBite" }] }),
  component: OrdersPage,
});

const STATUS_LABEL: Record<Order["status"], string> = {
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const STATUS_STYLE: Record<Order["status"], string> = {
  preparing: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-sky-100 text-sky-700",
  delivered: "bg-emerald-100 text-emerald-700",
};

function fmt(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => setOrders(loadOrders()), []);

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-xl font-black text-slate-900">Order history</h1>
        </div>

        {orders.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center">
              <Package className="w-12 h-12 text-white" />
            </div>
            <p className="mt-4 font-semibold text-slate-800">No orders yet</p>
            <p className="text-sm text-slate-500">Your past orders will appear here.</p>
            <Link
              to="/home"
              className="mt-6 px-6 h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center shadow-md shadow-pink-200"
            >
              Start ordering
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="bg-white/90 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {o.restaurantName || "Order"} · {o.items.length} items
                    </p>
                    <p className="text-[11px] text-slate-500">{fmt(o.placedAt)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {o.items.slice(0, 4).map((it) => (
                    <div key={it.id} className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100">
                      {it.image ? (
                        <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">{it.emoji}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500">{o.paymentMethod}</p>
                    <p className="font-bold text-slate-900">₹{o.total}</p>
                  </div>
                  <button
                    className="text-xs font-semibold text-violet-600 flex items-center gap-1"
                    onClick={() => alert("Reorder coming soon")}
                  >
                    <RotateCcw className="w-3 h-3" /> Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
