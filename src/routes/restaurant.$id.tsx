import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Star, Clock, Plus } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { findRestaurant, type Dish } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/$id")({
  loader: ({ params }) => {
    const r = findRestaurant(params.id);
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Restaurant"} – QuickBite` },
      { name: "description", content: `Order from ${loaderData?.name} on QuickBite.` },
    ],
  }),
  notFoundComponent: () => (
    <MobileShell>
      <div className="p-8 text-center">
        <p>Restaurant not found.</p>
        <Link to="/home" className="text-violet-600 underline">Back home</Link>
      </div>
    </MobileShell>
  ),
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
  component: RestaurantPage,
});

function RestaurantPage() {
  const r = Route.useLoaderData();
  const { add } = useCart();

  return (
    <MobileShell>
      <div className={`relative h-56 bg-gradient-to-br ${r.gradient} overflow-hidden`}>
        <img src={r.image} alt={r.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <Link
          to="/home"
          className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
      </div>

      <div className="px-5 -mt-6 relative">
        <div className="bg-white rounded-3xl p-5 shadow-md">
          <h1 className="text-xl font-black text-slate-900">{r.name}</h1>
          <p className="text-sm text-slate-500">{r.cuisine}</p>
          <div className="mt-2 flex gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r.rating}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {r.eta}
            </span>
          </div>
        </div>

        <h2 className="mt-6 font-bold text-slate-800">Menu</h2>
        <div className="mt-3 space-y-3">
          {r.dishes.map((d: Dish) => (
            <div key={d.id} className="flex items-center gap-3 bg-white/90 rounded-2xl p-3 shadow-sm">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img src={d.image} alt={d.name} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{d.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{d.desc}</p>
                <p className="mt-1 text-sm font-bold text-violet-600">₹{d.price}</p>
              </div>
              <button
                onClick={() => {
                  add({
                    id: d.id,
                    name: d.name,
                    price: d.price,
                    emoji: d.emoji,
                    restaurantId: r.id,
                    restaurantName: r.name,
                  });
                  toast.success(`${d.name} added`);
                }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-200 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
