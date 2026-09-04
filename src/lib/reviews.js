// Backwards-compatible shim over cloud reviews.
// Existing components use synchronous localStorage-style helpers; we now
// hydrate from Supabase in the background and cache the latest snapshot.
import { supabase } from "@/integrations/supabase/client";
const KEY = "quickbite_reviews_cache_v2";
function readCache() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "[]");
    }
    catch {
        return [];
    }
}
function writeCache(list) {
    try {
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
    }
    catch { }
}
function rowToReview(row) {
    return {
        id: row.id,
        restaurantId: row.restaurant_id,
        rating: row.rating,
        comment: row.comment ?? "",
        author: row.author ?? "Customer",
        createdAt: new Date(row.created_at).getTime(),
        reply: row.reply,
    };
}
export function loadReviews() {
    return readCache();
}
export function reviewsFor(restaurantId) {
    return readCache().filter((r) => r.restaurantId === restaurantId);
}
export async function refreshReviewsFor(restaurantId) {
    const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
    const list = (data ?? []).map(rowToReview);
    const others = readCache().filter((r) => r.restaurantId !== restaurantId);
    writeCache([...list, ...others]);
    return list;
}
export async function addReview(r) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user)
        throw new Error("Please sign in to leave a review");
    const { error } = await supabase.from("reviews").insert({
        restaurant_id: r.restaurantId,
        rating: r.rating,
        comment: r.comment,
        author: r.author,
        user_id: userData.user.id,
    });
    if (error)
        throw error;
    await refreshReviewsFor(r.restaurantId);
}
export function avgRating(restaurantId, fallback) {
    const list = reviewsFor(restaurantId);
    if (!list.length)
        return fallback;
    const sum = list.reduce((s, r) => s + r.rating, 0);
    return Math.round((sum / list.length) * 10) / 10;
}
