import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchCloudOrders, loadOrders } from "@/lib/orders";
export const Route = createFileRoute("/invoice/$id")({
    head: () => ({ meta: [{ title: "Invoice – QuickBite" }] }),
    component: InvoicePage,
    notFoundComponent: () => <div className="p-8 text-center">Invoice not found. <Link to="/invoices" className="text-violet-600 underline">Back</Link></div>,
    errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
});
function InvoicePage() {
    const { id } = Route.useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            const local = loadOrders().find((o) => o.id === id);
            if (local)
                setOrder(local);
            const cloud = await fetchCloudOrders();
            const found = cloud?.find((o) => o.id === id);
            if (found)
                setOrder(found);
            setLoading(false);
        })();
    }, [id]);
    if (loading)
        return <div className="p-8 text-center text-sm text-slate-400">Loading…</div>;
    if (!order)
        throw notFound();
    const gst = Math.round(order.subtotal * 0.05);
    const base = order.subtotal - gst;
    return (<div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } .invoice-sheet { box-shadow: none !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/invoices" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-slate-700"/>
          </Link>
          <p className="flex-1 font-bold text-slate-900">Invoice · #{order.id.slice(0, 8)}</p>
          <button onClick={() => window.print()} className="px-4 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5"/> Download / Print
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="invoice-sheet bg-white rounded-2xl shadow-lg p-6 md:p-10">
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="text-3xl font-black bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">QuickBite</div>
              <p className="text-xs text-slate-500 mt-1">Food delivery, made delicious</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Invoice</p>
              <p className="text-sm font-black text-slate-900 mt-1">#{order.id.slice(0, 12).toUpperCase()}</p>
              <p className="text-[11px] text-slate-500">{new Date(order.placedAt).toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200 text-sm">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Restaurant</p>
              <p className="font-semibold text-slate-800">{order.restaurantName || "QuickBite Partner"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Payment</p>
              <p className="font-semibold text-slate-800">{order.paymentMethod}</p>
              <p className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {order.paymentStatus === "paid" ? "PAID" : "COD / PENDING"}
              </p>
              {order.transactionId && <p className="text-[11px] text-slate-500 mt-1">Txn: {order.transactionId}</p>}
            </div>
          </div>

          <table className="w-full mt-6 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-400 uppercase border-b border-slate-200">
                <th className="py-2">Item</th>
                <th className="py-2 text-center w-16">Qty</th>
                <th className="py-2 text-right w-24">Price</th>
                <th className="py-2 text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (<tr key={it.id} className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-800">{it.name}</td>
                  <td className="py-2.5 text-center text-slate-600">{it.qty}</td>
                  <td className="py-2.5 text-right text-slate-600">₹{it.price}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-800">₹{it.price * it.qty}</td>
                </tr>))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs text-sm space-y-1">
              <Row label="Item total" value={`₹${base}`}/>
              <Row label="GST (5%)" value={`₹${gst}`}/>
              <Row label="Delivery fee" value={`₹${order.deliveryFee}`}/>
              {order.discount > 0 && <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`-₹${order.discount}`} accent/>}
              <div className="h-px bg-slate-300 my-2"/>
              <Row label="Grand total" value={`₹${order.total}`} bold/>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
            <p>Thank you for ordering with QuickBite. This is a computer-generated invoice.</p>
            <p className="text-right">quickbite.app · support@quickbite.app</p>
          </div>
        </div>
      </div>
    </div>);
}
function Row({ label, value, bold, accent }) {
    return (<div className={`flex justify-between ${bold ? "font-black text-slate-900 text-base" : accent ? "text-emerald-600 font-semibold" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>);
}
