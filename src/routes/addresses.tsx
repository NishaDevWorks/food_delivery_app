import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Plus, Trash2, Home, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { toast } from "sonner";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Addresses – QuickBite" }] }),
  component: AddressesPage,
});

type Addr = { id: string; label: string; line: string; type: "home" | "work" | "other" };

const KEY = "quickbite_addresses";

function AddressesPage() {
  const [list, setList] = useState<Addr[]>([]);
  const [label, setLabel] = useState("");
  const [line, setLine] = useState("");
  const [type, setType] = useState<Addr["type"]>("home");

  useEffect(() => {
    try { setList(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
  }, []);

  const save = (next: Addr[]) => {
    setList(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !line) return toast.error("Fill all fields");
    save([...list, { id: `a_${Date.now()}`, label, line, type }]);
    setLabel(""); setLine("");
    toast.success("Address saved");
  };

  return (
    <MobileShell>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-xl font-black text-slate-900">Saved addresses</h1>
        </div>

        <div className="mt-5 space-y-2">
          {list.length === 0 && <p className="text-sm text-slate-500">No addresses yet.</p>}
          {list.map((a) => (
            <div key={a.id} className="flex items-center gap-3 bg-white/90 rounded-2xl p-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                {a.type === "home" ? <Home className="w-4 h-4" /> : a.type === "work" ? <Briefcase className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">{a.label}</p>
                <p className="text-xs text-slate-500 truncate">{a.line}</p>
              </div>
              <button onClick={() => save(list.filter((x) => x.id !== a.id))} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={add} className="mt-6 bg-white/90 rounded-3xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-800">Add new</p>
          <div className="flex gap-2">
            {(["home", "work", "other"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 h-10 rounded-xl text-xs font-semibold capitalize ${type === t ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white" : "bg-slate-50 text-slate-600 border border-slate-200"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Home)" className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm" />
          <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Full address" className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm" />
          <button className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Save address
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
