import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { fetchCloudOrders, loadOrders } from "@/lib/orders";
export const Route = createFileRoute("/invoices")({
    head: () => ({ meta: [{ title: "Invoices – QuickBite" }] }),
    component: InvoicesPage,
});
function InvoicesPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            setOrders(loadOrders());
            const cloud = await fetchCloudOrders();
            if (cloud)
                setOrders(cloud);
            setLoading(false);
        })();
    }, []);
    const delivered = orders.filter((o) => o.status === "delivered" || o.paymentStatus === "paid");
    return (<MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-slate-700"/>
          </Link>
          <h1 className="text-xl font-black text-slate-900">Invoices</h1>
        </div>

        {loading ? (<div className="py-10 text-center text-sm text-slate-400">Loading…</div>) : delivered.length === 0 ? (<div className="mt-16 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-400"/>
            </div>
            <p className="mt-3 font-semibold text-slate-700">No invoices yet</p>
            <p className="text-xs text-slate-500">Completed orders will show up here.</p>
          </div>) : (<div className="mt-5 space-y-2">
            {delivered.map((o) => (<div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-violet-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{o.restaurantName || "Order"}</p>
                  <p className="text-[11px] text-slate-500">
                    #{o.id.slice(0, 8)} · {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">₹{o.total}</p>
                </div>
                <Link to="/invoice/$id" params={{ id: o.id }} className="px-3 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5"/> View
                </Link>
              </div>))}
          </div>)}
      </div>
    </MobileShell>);
}
