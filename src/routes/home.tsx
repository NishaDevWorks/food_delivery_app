import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Star, Clock } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { restaurants } from "@/lib/data";
import { useState } from "react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "QuickBite – Browse" },
      { name: "description", content: "Browse nearby restaurants and discover what to eat." },
    ],
  }),
  component: HomePage,
});

const categories = [
  { label: "All", emoji: "🍽️" },
  { label: "Pizza", emoji: "🍕" },
  { label: "Sushi", emoji: "🍣" },
  { label: "Indian", emoji: "🍛" },
  { label: "Healthy", emoji: "🥗" },
  { label: "Drinks", emoji: "🥤" },
];

function HomePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const filtered = restaurants.filter(
    (r) =>
      (cat === "All" || r.cuisine.toLowerCase().includes(cat.toLowerCase())) &&
      r.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Deliver to</p>
            <h2 className="font-bold text-slate-800">Home · MG Road</h2>
          </div>
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-300 to-pink-300 flex items-center justify-center text-white font-bold">
            R
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-black text-slate-900 leading-tight">
          What would you like<br />to eat today?
        </h1>

        <div className="mt-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search restaurants or dishes"
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          {categories.map((c) => (
            <button
              key={c.label}
              onClick={() => setCat(c.label)}
              className={`shrink-0 px-4 h-10 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
                cat === c.label
                  ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md shadow-pink-200"
                  : "bg-white/80 text-slate-600 border border-slate-200"
              }`}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        <h3 className="mt-6 font-bold text-slate-800">Featured</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to="/restaurant/$id"
              params={{ id: r.id }}
              className="rounded-2xl bg-white/90 p-3 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <div className={`aspect-square rounded-xl bg-gradient-to-br ${r.gradient} overflow-hidden`}>
                <img
                  src={r.image}
                  alt={r.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="mt-2 font-semibold text-sm text-slate-800 truncate">{r.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{r.cuisine}</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {r.rating}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {r.eta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
