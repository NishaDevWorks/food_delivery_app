import { supabase } from "@/integrations/supabase/client";

export type CloudReview = {
  id: string;
  restaurant_id: string;
  user_id: string;
  order_id: string | null;
  author: string | null;
  rating: number;
  comment: string | null;
  reply: string | null;
  status: "new" | "replied" | "archived";
  created_at: string;
  updated_at: string;
};

export async function fetchReviewsFor(rid: string): Promise<CloudReview[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: false });
  return ((data as any) ?? []) as CloudReview[];
}

export async function fetchAllReviewsForOwner(rid: string) {
  return fetchReviewsFor(rid);
}

export async function submitReview(input: {
  restaurant_id: string;
  rating: number;
  comment: string;
  order_id?: string | null;
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Please sign in to leave a review");
  const meta = (userData.user.user_metadata ?? {}) as any;
  const author = meta.full_name || meta.name || userData.user.email?.split("@")[0] || "Customer";
  const { error } = await supabase.from("reviews").insert({
    restaurant_id: input.restaurant_id,
    rating: input.rating,
    comment: input.comment,
    order_id: input.order_id ?? null,
    author,
    user_id: userData.user.id,
  } as any);
  if (error) throw error;
}

export async function replyToReview(id: string, reply: string) {
  const { error } = await supabase
    .from("reviews")
    .update({ reply, status: "replied" } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function setReviewStatus(id: string, status: "new" | "replied" | "archived") {
  const { error } = await supabase.from("reviews").update({ status } as any).eq("id", id);
  if (error) throw error;
}

export async function avgRatingCloud(rid: string, fallback: number) {
  const list = await fetchReviewsFor(rid);
  if (!list.length) return { avg: fallback, count: 0 };
  const sum = list.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / list.length) * 10) / 10, count: list.length };
}
