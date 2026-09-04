import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { OwnerShell, useActiveRestaurant } from "@/components/OwnerShell";
import { addMenuItem, deleteMenuItem, fetchMenuItems, updateMenuItem } from "@/lib/owner-api";
import { Plus, Trash2, Leaf, Beef } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/owner/menu")({
    head: () => ({ meta: [{ title: "Menu – Owner" }] }),
    component: () => (<OwnerShell>
      <MenuPage />
    </OwnerShell>),
});
const CATEGORIES = ["Starters", "Mains", "Drinks", "Desserts"];
function MenuPage() {
    const [rid] = useActiveRestaurant();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState("");
    const [category, setCategory] = useState(CATEGORIES[1]);
    const [emoji, setEmoji] = useState("🍽️");
    const [isVeg, setIsVeg] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    async function load() {
        if (!rid)
            return;
        setLoading(true);
        setItems(await fetchMenuItems(rid));
        setLoading(false);
    }
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [rid]);
    async function submit(e) {
        e.preventDefault();
        if (!rid || !name || !price)
            return toast.error("Name and price required");
        setSubmitting(true);
        try {
            await addMenuItem({
                restaurant_id: rid, name, price: Number(price),
                description: description || null, image: image || null, emoji, category, is_veg: isVeg, in_stock: true,
            });
            setName("");
            setPrice("");
            setDescription("");
            setImage("");
            await load();
            toast.success("Item added");
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setSubmitting(false);
        }
    }
    async function toggleStock(item) {
        await updateMenuItem(item.id, { in_stock: !item.in_stock });
        setItems((cur) => cur.map((i) => i.id === item.id ? { ...i, in_stock: !i.in_stock } : i));
    }
    async function remove(item) {
        if (!confirm(`Delete "${item.name}"?`))
            return;
        await deleteMenuItem(item.id);
        setItems((cur) => cur.filter((i) => i.id !== item.id));
    }
    const grouped = useMemo(() => {
        const g = {};
        for (const it of items)
            (g[it.category] = g[it.category] || []).push(it);
        return g;
    }, [items]);
    return (<div className="grid md:grid-cols-[380px_1fr] gap-4">
      {/* Add form */}
      <div className="bg-white rounded-3xl p-5 shadow-sm h-fit sticky top-32">
        <h3 className="text-sm font-black text-slate-900">Add menu item</h3>
        <form onSubmit={submit} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 h-11 text-center rounded-xl bg-slate-50 border border-slate-200 text-xl"/>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
          </div>
          <div className="flex gap-2">
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price (₹)" className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
          <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL (optional)" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsVeg(true)} className={`flex-1 h-10 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1 ${isVeg ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
              <Leaf className="w-3 h-3"/> Veg
            </button>
            <button type="button" onClick={() => setIsVeg(false)} className={`flex-1 h-10 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1 ${!isVeg ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500"}`}>
              <Beef className="w-3 h-3"/> Non-veg
            </button>
          </div>
          <button disabled={submitting} className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-60">
            <Plus className="w-4 h-4"/> Add item
          </button>
        </form>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (<div className="text-center py-10 text-slate-400 text-sm">Loading…</div>) : items.length === 0 ? (<div className="bg-white rounded-3xl p-10 text-center text-sm text-slate-400">
            No menu items yet. Add your first dish on the left.
          </div>) : (CATEGORIES.filter((c) => grouped[c]?.length).map((cat) => (<div key={cat} className="bg-white rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-3">{cat}</h3>
              <div className="space-y-2">
                {grouped[cat].map((it) => (<div key={it.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-2xl shrink-0">
                      {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover"/> : it.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-sm border ${it.is_veg ? "border-emerald-500" : "border-rose-500"} flex items-center justify-center`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${it.is_veg ? "bg-emerald-500" : "bg-rose-500"}`}/>
                        </span>
                        <p className="font-semibold text-sm text-slate-800 truncate">{it.name}</p>
                      </div>
                      <p className="text-xs text-violet-600 font-bold">₹{it.price}</p>
                    </div>
                    <button onClick={() => toggleStock(it)} className={`text-[10px] font-bold px-2 py-1 rounded-full ${it.in_stock ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                      {it.in_stock ? "In stock" : "Out"}
                    </button>
                    <button onClick={() => remove(it)} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>))}
              </div>
            </div>)))}
      </div>
    </div>);
}
