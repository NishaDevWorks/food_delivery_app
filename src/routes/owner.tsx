import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { restaurants } from "@/lib/data";
import { addCustomDish, removeCustomDish, useCustomDishes } from "@/lib/owner";
import { toast } from "sonner";

export const Route = createFileRoute("/owner")({
  head: () => ({ meta: [{ title: "Owner – QuickBite" }] }),
  component: OwnerPage,
});

function OwnerPage() {
  const [rid, setRid] = useState(restaurants[0].id);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const dishes = useCustomDishes(rid);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return toast.error("Name and price required");
    addCustomDish(rid, {
      name,
      price: Number(price),
      desc: desc || "Fresh & tasty",
      emoji,
      image:
        image ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=70",
    });
    setName(""); setPrice(""); setDesc(""); setImage("");
    toast.success("Item added");
  };

  return (
    <MobileShell>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-xl font-black text-slate-900">Owner · Add items</h1>
        </div>

        <label className="mt-5 block text-xs font-semibold text-slate-600">Restaurant</label>
        <select
          value={rid}
          onChange={(e) => setRid(e.target.value)}
          className="mt-1 w-full h-12 px-4 rounded-2xl bg-white border border-slate-200 text-sm"
        >
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <form onSubmit={submit} className="mt-5 bg-white/90 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex gap-3">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-14 h-12 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xl"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="flex-1 h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
            />
          </div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price (₹)"
            type="number"
            className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Short description"
            className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
          />
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
          />
          <button className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-pink-200">
            <Plus className="w-4 h-4" /> Add item
          </button>
        </form>

        <h2 className="mt-6 font-bold text-slate-800">Your items</h2>
        {dishes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No custom items yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {dishes.map((d) => (
              <div key={d.id} className="flex items-center gap-3 bg-white/90 rounded-2xl p-3 shadow-sm">
                <img src={d.image} alt={d.name} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{d.name}</p>
                  <p className="text-xs text-violet-600 font-bold">₹{d.price}</p>
                </div>
                <button
                  onClick={() => removeCustomDish(rid, d.id)}
                  className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
