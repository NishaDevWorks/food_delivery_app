import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, Plus, Trash2, Wallet, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { toast } from "sonner";
export const Route = createFileRoute("/payments")({
    head: () => ({ meta: [{ title: "Payment methods – QuickBite" }] }),
    component: PaymentsPage,
});
const KEY = "quickbite_payments";
function PaymentsPage() {
    const [list, setList] = useState([]);
    const [type, setType] = useState("upi");
    const [detail, setDetail] = useState("");
    useEffect(() => {
        try {
            setList(JSON.parse(localStorage.getItem(KEY) || "[]"));
        }
        catch { }
    }, []);
    const save = (next) => {
        setList(next);
        localStorage.setItem(KEY, JSON.stringify(next));
    };
    const add = (e) => {
        e.preventDefault();
        if (!detail)
            return toast.error("Enter details");
        const label = type === "card" ? `Card •••• ${detail.slice(-4)}` : type === "upi" ? `UPI ${detail}` : `Wallet ${detail}`;
        save([...list, { id: `p_${Date.now()}`, type, label, detail }]);
        setDetail("");
        toast.success("Payment method added");
    };
    const icon = (t) => t === "card" ? <CreditCard className="w-4 h-4"/> : t === "upi" ? <Smartphone className="w-4 h-4"/> : <Wallet className="w-4 h-4"/>;
    return (<MobileShell>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
            <ArrowLeft className="w-5 h-5 text-slate-700"/>
          </Link>
          <h1 className="text-xl font-black text-slate-900">Payment methods</h1>
        </div>

        <div className="mt-5 space-y-2">
          {list.length === 0 && <p className="text-sm text-slate-500">No payment methods yet.</p>}
          {list.map((m) => (<div key={m.id} className="flex items-center gap-3 bg-white/90 rounded-2xl p-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">{icon(m.type)}</div>
              <p className="flex-1 text-sm font-semibold text-slate-800">{m.label}</p>
              <button onClick={() => save(list.filter((x) => x.id !== m.id))} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>))}
        </div>

        <form onSubmit={add} className="mt-6 bg-white/90 rounded-3xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-800">Add new</p>
          <div className="flex gap-2">
            {["upi", "card", "wallet"].map((t) => (<button type="button" key={t} onClick={() => setType(t)} className={`flex-1 h-10 rounded-xl text-xs font-semibold capitalize ${type === t ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                {t}
              </button>))}
          </div>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={type === "card" ? "Card number" : type === "upi" ? "name@upi" : "Wallet name (Paytm…)"} className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm"/>
          <button className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4"/> Add method
          </button>
        </form>
      </div>
    </MobileShell>);
}
