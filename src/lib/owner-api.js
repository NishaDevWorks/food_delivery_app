import { supabase } from "@/integrations/supabase/client";
import { restaurants as staticRestaurants } from "@/lib/data";
export async function fetchMyRestaurants() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user)
        return [];
    const { data, error } = await supabase
        .from("restaurant_owners")
        .select("restaurant_id")
        .eq("user_id", userData.user.id);
    if (error || !data)
        return [];
    return data
        .map((r) => staticRestaurants.find((s) => s.id === r.restaurant_id))
        .filter(Boolean)
        .map((r) => ({ id: r.id, name: r.name, image: r.image }));
}
export async function isOwner() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user)
        return false;
    const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "owner")
        .maybeSingle();
    return !!data;
}
export async function fetchSettings(rid) {
    const { data } = await supabase.from("restaurant_settings").select("*").eq("restaurant_id", rid).maybeSingle();
    return data ?? null;
}
export async function fetchOpenStatuses() {
    const { data } = await supabase.from("restaurant_settings").select("restaurant_id,is_open");
    const map = {};
    (data ?? []).forEach((r) => { map[r.restaurant_id] = r.is_open; });
    return map;
}
export async function upsertSettings(s) {
    const { error } = await supabase.from("restaurant_settings").upsert(s, { onConflict: "restaurant_id" });
    if (error)
        throw error;
}
export async function fetchMenuItems(rid) {
    const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("category").order("name");
    return data ?? [];
}
export async function addMenuItem(item) {
    const { error } = await supabase.from("menu_items").insert(item);
    if (error)
        throw error;
}
export async function updateMenuItem(id, patch) {
    const { error } = await supabase.from("menu_items").update(patch).eq("id", id);
    if (error)
        throw error;
}
export async function deleteMenuItem(id) {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error)
        throw error;
}
export async function fetchOwnerOrders(rid, opts) {
    let q = supabase.from("orders").select("*").eq("restaurant_id", rid).order("placed_at", { ascending: false }).limit(200);
    if (opts?.since)
        q = q.gte("placed_at", opts.since);
    const { data } = await q;
    return (data ?? []);
}
export async function updateOrderStatus(id, status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error)
        throw error;
}
