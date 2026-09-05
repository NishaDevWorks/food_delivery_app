import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, Star, Clock } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useFavorites } from "@/lib/favorites";
import { restaurants } from "@/lib/data";
export const Route = createFileRoute("/favorites")({
    head: () => ({ meta: [{ title: "Favorites – QuickBite" }] }),
    component: FavoritesPage,
});
function FavoritesPage() {
    const { restaurants: favRestIds, dishes: favDishIds, toggleDish, toggleRestaurant } = useFavorites();
    const favRests = restaurants.filter((r) => favRestIds.includes(r.id));
    const favDishes = restaurants
        .flatMap((r) => r.dishes.map((d) => ({ ...d, restaurantName: r.name, restaurantId: r.id })))
        .filter((d) => favDishIds.includes(d.id));
    const empty = favRests.length === 0 && favDishes.length === 0;
    return (<MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-slate-700"/>
          </Link>
          <h1 className="text-xl font-black text-slate-900">Favorites</h1>
        </div>

        {empty ? (<div className="mt-20 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-200 to-pink-200 flex items-center justify-center">
              <Heart className="w-12 h-12 text-white fill-white"/>
            </div>
            <p className="mt-4 font-semibold text-slate-800">Nothing saved yet</p>
            <p className="text-sm text-slate-500">Tap the heart on any dish or restaurant.</p>
          </div>) : (<>
            {favRests.length > 0 && (<>
                <h3 className="mt-6 font-bold text-slate-800">Restaurants</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {favRests.map((r) => (<div key={r.id} className="rounded-2xl bg-white/90 p-3 shadow-sm">
                      <Link to="/restaurant/$id" params={{ id: r.id }}>
                        <div className={`aspect-square rounded-xl bg-gradient-to-br ${r.gradient} overflow-hidden`}>
                          <img src={r.image} alt={r.name} className="w-full h-full object-cover"/>
                        </div>
                        <p className="mt-2 font-semibold text-sm text-slate-800 truncate">{r.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/>{r.rating}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3"/>{r.eta}</span>
                        </div>
                      </Link>
                      <button onClick={() => toggleRestaurant(r.id)} className="mt-2 text-[11px] text-rose-500 font-semibold">Remove</button>
                    </div>))}
                </div>
              </>)}

            {favDishes.length > 0 && (<>
                <h3 className="mt-6 font-bold text-slate-800">Dishes</h3>
                <div className="mt-3 space-y-3">
                  {favDishes.map((d) => (<div key={d.id} className="bg-white/90 rounded-2xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={d.image} alt={d.name} className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{d.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{d.restaurantName}</p>
                        <p className="text-sm font-bold text-violet-600">₹{d.price}</p>
                      </div>
                      <button onClick={() => toggleDish(d.id)} className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                        <Heart className="w-4 h-4 fill-rose-500"/>
                      </button>
                    </div>))}
                </div>
              </>)}
          </>)}
      </div>
    </MobileShell>);
}
