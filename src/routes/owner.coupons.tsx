import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OwnerShell, useActiveRestaurant } from "@/components/OwnerShell";
import { fetchOwnerCoupons, createCoupon, updateCoupon, deleteCoupon, type CloudCoupon } from "@/lib/coupons";
import { Tag, Plus, Trash2, Power, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/owner/coupons")({
  head: () => ({ meta: [{ title: "Coupons – Owner" }] }),
  component: () => (<OwnerShell><CouponsPage /></OwnerShell>),
});

function CouponsPage() {
  const [rid] = useActiveRestaurant();
  const [rows, setRows] = useState<CloudCoupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "flat" as CloudCoupon["type"],
    value: 50,
    min_order: 0,
    max_discount: "" as string | number,
    expires_at: "",
    usage_limit: "" as string | number,
  });

  async function load() { if (rid) setRows(await fetchOwnerCoupons(rid)); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [rid]);

  async function save() {
    if (!rid) return;
    if (!form.code.trim()) return toast.error("Enter a code");
    setBusy(true);
    try {
      await createCoupon({
        restaurant_id: rid,
        code: form.code.trim().toUpperCase(),
        description: form.description || `${form.type === "percent" ? form.value + "% off" : form.type === "flat" ? "₹" + form.value + " off" : "Free delivery"}`,
        type: form.type,
        value: Number(form.value) || 0,
        min_order: Number(form.min_order) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      });
      toast.success("Coupon created");
      setShowForm(false);
      setForm({ code: "", description: "", type: "flat", value: 50, min_order: 0, max_discount: "", expires_at: "", usage_limit: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function toggle(c: CloudCoupon) {
    try { await updateCoupon(c.id, { active: !c.active }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function remove(c: CloudCoupon) {
    if (!confirm(`Delete ${c.code}?`)) return;
    try { await deleteCoupon(c.id); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Coupons</h2>
          <p className="text-xs text-slate-500">Create promo codes customers can apply at checkout.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Code">
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="input" />
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))} className="input">
                <option value="flat">Flat ₹ off</option>
                <option value="percent">% off</option>
                <option value="free_delivery">Free delivery</option>
              </select>
            </Field>
            {form.type !== "free_delivery" && (
              <Field label={form.type === "percent" ? "Percent (%)" : "Amount (₹)"}>
                <input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} className="input" />
              </Field>
            )}
            <Field label="Min order (₹)">
              <input type="number" value={form.min_order} onChange={(e) => setForm((f) => ({ ...f, min_order: Number(e.target.value) }))} className="input" />
            </Field>
            {form.type === "percent" && (
              <Field label="Max discount (₹)">
                <input type="number" value={form.max_discount} onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value }))} className="input" placeholder="Optional" />
              </Field>
            )}
            <Field label="Usage limit">
              <input type="number" value={form.usage_limit} onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))} className="input" placeholder="Unlimited" />
            </Field>
            <Field label="Expires">
              <input type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} className="input" />
            </Field>
            <Field label="Description" full>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Auto-generated if empty" className="input" />
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 h-10 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Cancel</button>
            <button onClick={save} disabled={busy} className="px-5 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold disabled:opacity-60">Save</button>
          </div>
          <style>{`.input { height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid rgb(226 232 240); font-size: 13px; width: 100%; background: white; }`}</style>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center">
          <Tag className="w-8 h-8 mb-2" /> No coupons yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md text-sm">{c.code}</span>
                    {!c.active && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">INACTIVE</span>}
                    {c.expires_at && new Date(c.expires_at) < new Date() && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">EXPIRED</span>}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{c.description}</p>
                  <div className="mt-2 flex gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span>{c.type === "percent" ? `${c.value}% off` : c.type === "flat" ? `₹${c.value} off` : "Free delivery"}</span>
                    {c.min_order > 0 && <span>Min ₹{c.min_order}</span>}
                    {c.max_discount && <span>Cap ₹{c.max_discount}</span>}
                    {c.usage_limit && <span>Used {c.used_count}/{c.usage_limit}</span>}
                    {!c.usage_limit && c.used_count > 0 && <span>Used {c.used_count}×</span>}
                    {c.expires_at && (
                      <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> {new Date(c.expires_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggle(c)} className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`} title="Toggle active">
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(c)} className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
