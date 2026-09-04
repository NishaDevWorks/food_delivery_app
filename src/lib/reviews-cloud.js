import { supabase } from "@/integrations/supabase/client";
export async function fetchReviewsFor(rid) {
    const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", rid)
        .order("created_at", { ascending: false });
    return (data ?? []);
}
export async function fetchAllReviewsForOwner(rid) {
    return fetchReviewsFor(rid);
}
export async function submitReview(input) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user)
        throw new Error("Please sign in to leave a review");
    const meta = (userData.user.user_metadata ?? {});
    const author = meta.full_name || meta.name || userData.user.email?.split("@")[0] || "Customer";
    const { error } = await supabase.from("reviews").insert({
        restaurant_id: input.restaurant_id,
        rating: input.rating,
        comment: input.comment,
        order_id: input.order_id ?? null,
        author,
        user_id: userData.user.id,
    });
    if (error)
        throw error;
}
export async function replyToReview(id, reply) {
    const { error } = await supabase
        .from("reviews")
        .update({ reply, status: "replied" })
        .eq("id", id);
    if (error)
        throw error;
}
export async function setReviewStatus(id, status) {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error)
        throw error;
}
export async function avgRatingCloud(rid, fallback) {
    const list = await fetchReviewsFor(rid);
    if (!list.length)
        return { avg: fallback, count: 0 };
    const sum = list.reduce((s, r) => s + r.rating, 0);
    return { avg: Math.round((sum / list.length) * 10) / 10, count: list.length };
}
