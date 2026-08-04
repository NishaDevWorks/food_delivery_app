import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Star, Clock, SlidersHorizontal, Heart, X, Flame, MessageSquare } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { restaurants } from "@/lib/data";
import { useFavorites } from "@/lib/favorites";
import { fetchOpenStatuses } from "@/lib/owner-api";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "QuickBite – Browse restaurants & dishes near you" },
      { name: "description", content: "Discover trending dishes, filter by price, rating and veg preference, and order in minutes." },
      { property: "og:title", content: "QuickBite – Browse restaurants & dishes" },
      { property: "og:description", content: "Trending dishes, smart filters and fast delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

type Stats = { avg: number; count: number };

function HomePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "nonveg">("all");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  const [sort, setSort] = useState<"rating" | "priceLow" | "fastest">("rating");
  const { isRestaurantFav, toggleRestaurant } = useFavorites();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<Record<string, Stats>>({});

  useEffect(() => {
    fetchOpenStatuses().then(setOpenMap).catch(() => {});
    supabase
      .from("reviews")
      .select("restaurant_id,rating")
      .then(({ data }) => {
        const map: Record<string, Stats> = {};
        (data ?? []).forEach((r: any) => {
          const cur = map[r.restaurant_id] ?? { avg: 0, count: 0 };
          cur.avg = (cur.avg * cur.count + r.rating) / (cur.count + 1);
          cur.count += 1;
          map[r.restaurant_id] = cur;
        });
        setStats(map);
      });
  }, []);

  const trending = useMemo(
    () =>
      restaurants
        .flatMap((r) => r.dishes.map((d) => ({ ...d, rid: r.id, rname: r.name })))
        .sort((a, b) => b.price - a.price)
        .slice(0, 8),
    []
  );

  const cheapest = (r: (typeof restaurants)[number]) => Math.min(...r.dishes.map((d) => d.price));

  const filtered = restaurants
    .filter((r) => {
      const text = q.toLowerCase();
      const matchesText =
        !text ||
        r.name.toLowerCase().includes(text) ||
        r.cuisine.toLowerCase().includes(text) ||
        r.dishes.some((d) => d.name.toLowerCase().includes(text));
      const matchesCat = cat === "All" || r.cuisine.toLowerCase().includes(cat.toLowerCase());
      const matchesDiet =
        dietFilter === "all" ||
        (dietFilter === "veg" ? r.dishes.some((d) => d.veg) : r.dishes.some((d) => !d.veg));
      const rating = stats[r.id]?.count ? stats[r.id].avg : r.rating;
      const matchesRating = rating >= minRating;
      const matchesPrice = cheapest(r) <= maxPrice;
      return matchesText && matchesCat && matchesDiet && matchesRating && matchesPrice;
    })
    .sort((a, b) => {
      if (sort === "priceLow") return cheapest(a) - cheapest(b);
      if (sort === "fastest") return parseInt(a.eta) - parseInt(b.eta);
      const ra = stats[a.id]?.count ? stats[a.id].avg : a.rating;
      const rb = stats[b.id]?.count ? stats[b.id].avg : b.rating;
      return rb - ra;
    });

  const activeFilterCount =
    (dietFilter !== "all" ? 1 : 0) + (minRating > 0 ? 1 : 0) + (maxPrice < 500 ? 1 : 0);

  function resetFilters() {
    setDietFilter("all");
    setMinRating(0);
    setMaxPrice(500);
    setSort("rating");
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

        {/* Trending dishes — real food photos */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-slate-800 text-sm">Trending near you</h3>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
            {trending.map((d) => (
              <Link
                key={`${d.rid}-${d.id}`}
                to="/restaurant/$id"
                params={{ id: d.rid }}
                className="snap-start shrink-0 w-36 rounded-2xl overflow-hidden bg-white/90 shadow-sm active:scale-[0.98] transition"
              >
                <div className="relative h-24">
                  <img src={d.image} alt={d.name} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 text-[10px] font-bold text-white bg-black/60 rounded-full px-2 py-0.5">
                    ₹{d.price}
                  </span>
                  <span
                    className={`absolute top-1 right-1 w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center ${
                      d.veg ? "border-emerald-500" : "border-rose-500"
                    } bg-white`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${d.veg ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-slate-800 truncate">{d.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{d.rname}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 bg-white/90 rounded-2xl p-4 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Filters</p>
              <button onClick={resetFilters} className="text-xs text-violet-600 font-semibold flex items-center gap-1">
                <X className="w-3 h-3" /> Reset
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Food preference</p>
              <div className="flex gap-2">
                {([
                  { k: "all", label: "All" },
                  { k: "veg", label: "🟢 Veg" },
                  { k: "nonveg", label: "🔴 Non-veg" },
                ] as const).map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setDietFilter(o.k)}
                    className={`flex-1 h-9 rounded-xl text-xs font-semibold border ${
                      dietFilter === o.k ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

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
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">Max dish price</p>
                <p className="text-xs font-bold text-slate-700">{maxPrice >= 500 ? "Any" : `₹${maxPrice}`}</p>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Sort by</p>
              <div className="flex gap-2">
                {([
                  { k: "rating", label: "Top rated" },
                  { k: "priceLow", label: "Price ↓" },
                  { k: "fastest", label: "Fastest" },
                ] as const).map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setSort(o.k)}
                    className={`flex-1 h-9 rounded-xl text-xs font-semibold border ${
                      sort === o.k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {o.label}
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
          <div className="mt-3 space-y-3">
            {filtered.map((r) => {
              const fav = isRestaurantFav(r.id);
              const closed = openMap[r.id] === false;
              const s = stats[r.id];
              const rating = s?.count ? s.avg : r.rating;
              return (
                <div key={r.id} className="relative">
                  <Link
                    to="/restaurant/$id"
                    params={{ id: r.id }}
                    className="flex gap-3 rounded-3xl bg-white/90 p-3 shadow-sm active:scale-[0.99] transition"
                  >
                    <div className={`relative w-24 h-24 shrink-0 rounded-2xl bg-gradient-to-br ${r.gradient} overflow-hidden`}>
                      <img
                        src={r.image}
                        alt={r.name}
                        loading="lazy"
                        className={`w-full h-full object-cover ${closed ? "grayscale opacity-70" : ""}`}
                      />
                      {closed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-[9px] font-bold text-white bg-rose-600 rounded-full px-2 py-0.5 uppercase tracking-wider">
                            Closed
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate pr-8">{r.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{r.cuisine}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                        <span className="flex items-center gap-0.5 font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                          <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                          {rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-0.5 text-slate-500">
                          <MessageSquare className="w-3 h-3" />
                          {s?.count ?? 0} reviews
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {r.eta}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        From <span className="font-bold text-slate-800">₹{cheapest(r)}</span>
                        {r.vegOnly && (
                          <span className="ml-2 text-[9px] font-bold text-emerald-600 border border-emerald-300 rounded px-1">
                            PURE VEG
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleRestaurant(r.id);
                    }}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow"
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
