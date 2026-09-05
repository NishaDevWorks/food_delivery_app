import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OwnerShell, useActiveRestaurant } from "@/components/OwnerShell";
import { fetchSettings, upsertSettings } from "@/lib/owner-api";
import { toast } from "sonner";
import { Save } from "lucide-react";
export const Route = createFileRoute("/owner/settings")({
    head: () => ({ meta: [{ title: "Settings – Owner" }] }),
    component: () => (<OwnerShell>
      <SettingsPage />
    </OwnerShell>),
});
function SettingsPage() {
    const [rid] = useActiveRestaurant();
    const [s, setS] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!rid)
            return;
        setLoading(true);
        fetchSettings(rid).then((row) => {
            setS(row ?? { restaurant_id: rid, is_open: true, prep_time_min: 20, min_order: 0 });
            setLoading(false);
        });
    }, [rid]);
    async function save() {
        if (!rid)
            return;
        setSaving(true);
        try {
            await upsertSettings({ ...s, restaurant_id: rid });
            toast.success("Settings saved");
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setSaving(false);
        }
    }
    if (loading)
        return <div className="text-center py-20 text-slate-400">Loading…</div>;
    return (<div className="max-w-xl mx-auto space-y-4">
      {/* Open toggle */}
      <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">Restaurant is {s.is_open ? "open" : "closed"}</p>
          <p className="text-xs text-slate-500">Toggle off to stop accepting new orders</p>
        </div>
        <button onClick={() => setS({ ...s, is_open: !s.is_open })} className={`w-14 h-8 rounded-full p-1 transition ${s.is_open ? "bg-emerald-500" : "bg-slate-300"}`}>
          <div className={`w-6 h-6 rounded-full bg-white transition ${s.is_open ? "translate-x-6" : ""}`}/>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-black text-slate-900">Operational</h3>
        <Field label="Prep time (min)">
          <input type="number" value={s.prep_time_min ?? ""} onChange={(e) => setS({ ...s, prep_time_min: Number(e.target.value) })} className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </Field>
        <Field label="Minimum order (₹)">
          <input type="number" value={s.min_order ?? ""} onChange={(e) => setS({ ...s, min_order: Number(e.target.value) })} className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </Field>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-black text-slate-900">Contact & branding</h3>
        <Field label="Phone">
          <input value={s.phone ?? ""} onChange={(e) => setS({ ...s, phone: e.target.value })} className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </Field>
        <Field label="Address">
          <textarea value={s.address ?? ""} onChange={(e) => setS({ ...s, address: e.target.value })} rows={2} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </Field>
        <Field label="Cover image URL">
          <input value={s.cover_image ?? ""} onChange={(e) => setS({ ...s, cover_image: e.target.value })} className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </Field>
        {s.cover_image && <img src={s.cover_image} alt="" className="w-full h-32 rounded-2xl object-cover"/>}
      </div>

      <button disabled={saving} onClick={save} className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">
        <Save className="w-4 h-4"/> {saving ? "Saving…" : "Save changes"}
      </button>
    </div>);
}
function Field({ label, children }) {
    return (<div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="mt-1">{children}</div>
    </div>);
}
