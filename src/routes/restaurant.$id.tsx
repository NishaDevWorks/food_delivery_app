import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Star, Clock, Plus, Heart, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { findRestaurant, type Dish } from "@/lib/data";
import { useCustomDishes } from "@/lib/owner";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { reviewsFor, refreshReviewsFor, addReview, avgRating, type Review } from "@/lib/reviews";
import { fetchSettings } from "@/lib/owner-api";
import { supabase } from "@/integrations/supabase/client";
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
  const custom = useCustomDishes(r.id);
  const dishes: Dish[] = [...custom, ...r.dishes];
  const { add } = useCart();
  const { isDishFav, toggleDish, isRestaurantFav, toggleRestaurant } = useFavorites();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(r.rating);
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setReviews(reviewsFor(r.id));
    setAvg(avgRating(r.id, r.rating));
    refreshReviewsFor(r.id).then((list) => {
      setReviews(list);
      setAvg(avgRating(r.id, r.rating));
    }).catch(() => {});
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    fetchSettings(r.id).then((s) => { if (s) setIsOpen(s.is_open); }).catch(() => {});
  }, [r.id, r.rating]);

  async function submitReview() {
    if (!newComment.trim() && newRating === 0) return;
    setPosting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const meta = (userData.user?.user_metadata ?? {}) as any;
      const author = meta.full_name || meta.name || userData.user?.email?.split("@")[0] || "Customer";
      await addReview({ restaurantId: r.id, rating: newRating, comment: newComment.trim(), author });
      setReviews(reviewsFor(r.id));
      setAvg(avgRating(r.id, r.rating));
      setNewComment("");
      setNewRating(5);
      setShowForm(false);
      toast.success("Thanks for your review!");
    } catch (e: any) {
      toast.error(e.message || "Could not post review");
    } finally { setPosting(false); }
  }

  const restFav = isRestaurantFav(r.id);

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
        <button
          onClick={() => toggleRestaurant(r.id)}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow"
          aria-label="Favorite"
        >
          <Heart className={`w-5 h-5 ${restFav ? "fill-rose-500 text-rose-500" : "text-slate-600"}`} />
        </button>
      </div>

      <div className="px-5 -mt-6 relative">
        <div className="bg-white rounded-3xl p-5 shadow-md">
          <h1 className="text-xl font-black text-slate-900">{r.name}</h1>
          <p className="text-sm text-slate-500">{r.cuisine}</p>
          <div className="mt-2 flex gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {avg}
              {reviews.length > 0 && (
                <span className="text-slate-400">({reviews.length})</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {r.eta}
            </span>
            <span className="text-slate-500">{"₹".repeat(r.priceLevel)}</span>
          </div>
        </div>

        <h2 className="mt-6 font-bold text-slate-800">Menu</h2>
        <div className="mt-3 space-y-3">
          {dishes.map((d: Dish) => {
            const fav = isDishFav(d.id);
            return (
              <div key={d.id} className="flex items-center gap-3 bg-white/90 rounded-2xl p-3 shadow-sm">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                  <img src={d.image} alt={d.name} loading="lazy" className="w-full h-full object-cover" />
                  {d.veg !== undefined && (
                    <div
                      className={`absolute top-1 left-1 w-3.5 h-3.5 border-[1.5px] flex items-center justify-center bg-white ${
                        d.veg ? "border-emerald-600" : "border-rose-600"
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${d.veg ? "bg-emerald-600" : "bg-rose-600"}`} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{d.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{d.desc}</p>
                  <p className="mt-1 text-sm font-bold text-violet-600">₹{d.price}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => toggleDish(d.id)}
                    className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"
                    aria-label="Favorite dish"
                  >
                    <Heart className={`w-4 h-4 ${fav ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                  </button>
                  <button
                    onClick={() => {
                      add({
                        id: d.id,
                        name: d.name,
                        price: d.price,
                        emoji: d.emoji,
                        image: d.image,
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
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Reviews ({reviews.length})</h2>
          {signedIn && (
            <button onClick={() => setShowForm((v) => !v)} className="text-xs font-semibold text-violet-600">
              {showForm ? "Cancel" : "Write a review"}
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-2 bg-white/95 rounded-2xl p-3 shadow-sm">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setNewRating(n)}>
                  <Star className={`w-6 h-6 ${n <= newRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your experience…"
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button
              onClick={submitReview}
              disabled={posting}
              className="mt-2 w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" /> {posting ? "Posting…" : "Post review"}
            </button>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="mt-3 space-y-2">
            {reviews.slice(0, 10).map((rv) => (
              <div key={rv.id} className="bg-white/90 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{rv.author}</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-3 h-3 ${n <= rv.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                    ))}
                  </div>
                </div>
                {rv.comment && <p className="mt-1 text-xs text-slate-600">{rv.comment}</p>}
                {rv.reply && (
                  <div className="mt-2 bg-violet-50 border-l-2 border-violet-400 p-2 rounded">
                    <p className="text-[10px] font-bold text-violet-700 uppercase">Owner reply</p>
                    <p className="text-xs text-slate-700 mt-0.5">{rv.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="h-6" />
      </div>
    </MobileShell>
  );
}
