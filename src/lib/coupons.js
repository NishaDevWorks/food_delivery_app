import { supabase } from "@/integrations/supabase/client";
// Static built-in fallbacks (always available even offline)
export const COUPONS = [
    {
        code: "WELCOME50",
        description: "Flat ₹50 off on orders above ₹200",
        minOrder: 200,
        apply: (sub) => ({ discount: sub >= 200 ? 50 : 0, freeDelivery: false }),
    },
    {
        code: "FLAT100",
        description: "Flat ₹100 off on orders above ₹500",
        minOrder: 500,
        apply: (sub) => ({ discount: sub >= 500 ? 100 : 0, freeDelivery: false }),
    },
    {
        code: "QUICK20",
        description: "20% off, max ₹150 discount",
        apply: (sub) => ({ discount: Math.min(Math.round(sub * 0.2), 150), freeDelivery: false }),
    },
    {
        code: "FREESHIP",
        description: "Free delivery on any order",
        apply: (_sub, fee) => ({ discount: 0, freeDelivery: fee > 0 }),
    },
];
function cloudToCoupon(c) {
    return {
        code: c.code,
        description: c.description,
        minOrder: c.min_order || undefined,
        apply: (sub, fee) => {
            if (c.min_order && sub < c.min_order)
                return { discount: 0, freeDelivery: false };
            if (c.type === "flat")
                return { discount: c.value, freeDelivery: false };
            if (c.type === "percent") {
                const raw = Math.round(sub * (c.value / 100));
                return { discount: c.max_discount ? Math.min(raw, c.max_discount) : raw, freeDelivery: false };
            }
            return { discount: 0, freeDelivery: fee > 0 };
        },
    };
}
export async function fetchAvailableCoupons(restaurantId) {
    const now = new Date().toISOString();
    let q = supabase.from("coupons").select("*").eq("active", true);
    if (restaurantId)
        q = q.or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`);
    const { data } = await q;
    const rows = (data ?? []);
    const valid = rows.filter((r) => !r.expires_at || r.expires_at > now).filter((r) => !r.usage_limit || r.used_count < r.usage_limit);
    const cloudCoupons = valid.map(cloudToCoupon);
    // merge — cloud codes take precedence
    const codes = new Set(cloudCoupons.map((c) => c.code));
    return [...cloudCoupons, ...COUPONS.filter((c) => !codes.has(c.code))];
}
export async function findCoupon(code, restaurantId) {
    const list = await fetchAvailableCoupons(restaurantId);
    return list.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
}
export async function bumpCouponUsage(code) {
    try {
        const { data } = await supabase.from("coupons").select("id, used_count").eq("code", code).maybeSingle();
        if (data) {
            await supabase.from("coupons").update({ used_count: data.used_count + 1 }).eq("id", data.id);
        }
    }
    catch { }
}
// Owner CRUD
export async function fetchOwnerCoupons(rid) {
    const { data } = await supabase.from("coupons").select("*").eq("restaurant_id", rid).order("created_at", { ascending: false });
    return (data ?? []);
}
export async function createCoupon(c) {
    const { error } = await supabase.from("coupons").insert(c);
    if (error)
        throw error;
}
export async function updateCoupon(id, patch) {
    const { error } = await supabase.from("coupons").update(patch).eq("id", id);
    if (error)
        throw error;
}
export async function deleteCoupon(id) {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error)
        throw error;
}
