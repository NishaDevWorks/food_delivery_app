import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Star, Clock, SlidersHorizontal, Heart, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { restaurants } from "@/lib/data";
import { useFavorites } from "@/lib/favorites";
import { fetchOpenStatuses } from "@/lib/owner-api";
import { useEffect, useState } from "react";

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
];

function HomePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [priceLevels, setPriceLevels] = useState<number[]>([]); // empty = all
  const { isRestaurantFav, toggleRestaurant } = useFavorites();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchOpenStatuses().then(setOpenMap).catch(() => {});
  }, []);

  const filtered = restaurants.filter((r) => {
    const text = q.toLowerCase();
    const matchesText =
      !text ||
      r.name.toLowerCase().includes(text) ||
      r.cuisine.toLowerCase().includes(text) ||
      r.dishes.some((d) => d.name.toLowerCase().includes(text));
    const matchesCat = cat === "All" || r.cuisine.toLowerCase().includes(cat.toLowerCase());
    const matchesVeg = !vegOnly || r.vegOnly;
    const matchesRating = r.rating >= minRating;
    const matchesPrice = priceLevels.length === 0 || priceLevels.includes(r.priceLevel);
    return matchesText && matchesCat && matchesVeg && matchesRating && matchesPrice;
  });

  const activeFilterCount =
    (vegOnly ? 1 : 0) + (minRating > 0 ? 1 : 0) + (priceLevels.length > 0 ? 1 : 0);

  function togglePrice(p: number) {
    setPriceLevels((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }
  function resetFilters() {
    setVegOnly(false);
    setMinRating(0);
    setPriceLevels([]);
  }

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

        <div className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search restaurants or dishes"
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              showFilters || activeFilterCount > 0
                ? "bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-md shadow-pink-200"
                : "bg-white/80 border border-slate-200 text-slate-600"
            }`}
            aria-label="Filters"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 bg-white/90 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Filters</p>
              <button onClick={resetFilters} className="text-xs text-violet-600 font-semibold flex items-center gap-1">
                <X className="w-3 h-3" /> Reset
              </button>
            </div>
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Pure veg only</span>
              <input
                type="checkbox"
                checked={vegOnly}
                onChange={(e) => setVegOnly(e.target.checked)}
                className="w-5 h-5 accent-violet-500"
              />
            </label>
            <div>
              <p className="text-xs text-slate-500 mb-1">Minimum rating</p>
              <div className="flex gap-2">
                {[0, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`flex-1 h-9 rounded-xl text-xs font-semibold border ${
                      minRating === r ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {r === 0 ? "Any" : `${r}+ ★`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Price range</p>
              <div className="flex gap-2">
                {[1, 2, 3].map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePrice(p)}
                    className={`flex-1 h-9 rounded-xl text-xs font-semibold border ${
                      priceLevels.includes(p) ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {"₹".repeat(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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

        <h3 className="mt-6 font-bold text-slate-800">
          {filtered.length} {filtered.length === 1 ? "place" : "places"} to eat
        </h3>
        {filtered.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 text-center py-8">
            No restaurants match your filters.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {filtered.map((r) => {
              const fav = isRestaurantFav(r.id);
              const closed = openMap[r.id] === false;
              return (
                <div key={r.id} className="relative">
                  <Link
                    to="/restaurant/$id"
                    params={{ id: r.id }}
                    className="block rounded-2xl bg-white/90 p-3 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition"
                  >
                    <div className={`relative aspect-square rounded-xl bg-gradient-to-br ${r.gradient} overflow-hidden`}>
                      <img
                        src={r.image}
                        alt={r.name}
                        loading="lazy"
                        className={`w-full h-full object-cover ${closed ? "grayscale opacity-70" : ""}`}
                      />
                      {closed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-[10px] font-bold text-white bg-rose-600 rounded-full px-2 py-0.5 uppercase tracking-wider">
                            Closed
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-slate-800 truncate">{r.name}</p>
                      <span className="text-[10px] text-slate-500">{"₹".repeat(r.priceLevel)}</span>
                    </div>
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
                      {r.vegOnly && (
                        <span className="text-[9px] font-bold text-emerald-600 border border-emerald-300 rounded px-1">
                          VEG
                        </span>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleRestaurant(r.id);
                    }}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow"
                    aria-label="Favorite"
                  >
                    <Heart className={`w-4 h-4 ${fav ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
