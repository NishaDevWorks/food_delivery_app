export type Review = {
  id: string;
  restaurantId: string;
  rating: number;
  comment: string;
  author: string;
  createdAt: number;
};

const KEY = "quickbite_reviews_v1";

export function loadReviews(): Review[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

export function reviewsFor(restaurantId: string): Review[] {
  return loadReviews().filter((r) => r.restaurantId === restaurantId);
}

export function addReview(r: Omit<Review, "id" | "createdAt">) {
  const all = loadReviews();
  all.unshift({ ...r, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function avgRating(restaurantId: string, fallback: number): number {
  const list = reviewsFor(restaurantId);
  if (!list.length) return fallback;
  const sum = list.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / list.length) * 10) / 10;
}
