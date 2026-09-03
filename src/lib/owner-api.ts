import { supabase } from "@/integrations/supabase/client";
import { restaurants as staticRestaurants } from "@/lib/data";

export type OwnedRestaurant = { id: string; name: string; image: string };

export async function fetchMyRestaurants(): Promise<OwnedRestaurant[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from("restaurant_owners")
    .select("restaurant_id")
    .eq("user_id", userData.user.id);
  if (error || !data) return [];
  return data
    .map((r) => staticRestaurants.find((s) => s.id === r.restaurant_id))
    .filter(Boolean)
    .map((r: any) => ({ id: r.id, name: r.name, image: r.image }));
}

export async function isOwner(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "owner")
    .maybeSingle();
  return !!data;
}

// --- Restaurant settings ---
export type RestaurantSettings = {
  restaurant_id: string;
  is_open: boolean;
  prep_time_min: number;
  min_order: number;
  cover_image: string | null;
  phone: string | null;
  address: string | null;
};

export async function fetchSettings(rid: string): Promise<RestaurantSettings | null> {
  const { data } = await supabase.from("restaurant_settings").select("*").eq("restaurant_id", rid).maybeSingle();
  return (data as any) ?? null;
}

export async function fetchOpenStatuses(): Promise<Record<string, boolean>> {
  const { data } = await supabase.from("restaurant_settings").select("restaurant_id,is_open");
  const map: Record<string, boolean> = {};
  (data ?? []).forEach((r: any) => { map[r.restaurant_id] = r.is_open; });
  return map;
}

export async function upsertSettings(s: Partial<RestaurantSettings> & { restaurant_id: string }) {
  const { error } = await supabase.from("restaurant_settings").upsert(s as any, { onConflict: "restaurant_id" });
  if (error) throw error;
}

// --- Menu items ---
export type MenuItem = {
  id: string;
  restaurant_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  emoji: string | null;
  is_veg: boolean;
  in_stock: boolean;
};

export async function fetchMenuItems(rid: string): Promise<MenuItem[]> {
  const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("category").order("name");
  return (data as any) ?? [];
}

export async function addMenuItem(item: Omit<MenuItem, "id">) {
  const { error } = await supabase.from("menu_items").insert(item as any);
  if (error) throw error;
}

export async function updateMenuItem(id: string, patch: Partial<MenuItem>) {
  const { error } = await supabase.from("menu_items").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}

// --- Orders ---
export type OwnerOrder = {
  id: string;
  items: any[];
  total: number;
  subtotal: number;
  status: string;
  payment_status: string;
  payment_method: string;
  placed_at: string;
  restaurant_id: string;
  restaurant_name: string | null;
  user_id: string;
};

export async function fetchOwnerOrders(rid: string, opts?: { since?: string }) {
  let q = supabase.from("orders").select("*").eq("restaurant_id", rid).order("placed_at", { ascending: false }).limit(200);
  if (opts?.since) q = q.gte("placed_at", opts.since);
  const { data } = await q;
  return ((data as any) ?? []) as OwnerOrder[];
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}
