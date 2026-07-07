import { supabase } from "@/integrations/supabase/client";

export type Coupon = {
  code: string;
  description: string;
  minOrder?: number;
  apply: (subtotal: number, deliveryFee: number) => { discount: number; freeDelivery: boolean };
};

export type CloudCoupon = {
  id: string;
  restaurant_id: string | null;
  code: string;
  description: string;
  type: "flat" | "percent" | "free_delivery";
  value: number;
  min_order: number;
  max_discount: number | null;
  active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
};

// Static built-in fallbacks (always available even offline)
export const COUPONS: Coupon[] = [
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

function cloudToCoupon(c: CloudCoupon): Coupon {
  return {
    code: c.code,
    description: c.description,
    minOrder: c.min_order || undefined,
    apply: (sub, fee) => {
      if (c.min_order && sub < c.min_order) return { discount: 0, freeDelivery: false };
      if (c.type === "flat") return { discount: c.value, freeDelivery: false };
      if (c.type === "percent") {
        const raw = Math.round(sub * (c.value / 100));
        return { discount: c.max_discount ? Math.min(raw, c.max_discount) : raw, freeDelivery: false };
      }
      return { discount: 0, freeDelivery: fee > 0 };
    },
  };
}

export async function fetchAvailableCoupons(restaurantId?: string | null): Promise<Coupon[]> {
  const now = new Date().toISOString();
  let q = supabase.from("coupons").select("*").eq("active", true);
  if (restaurantId) q = q.or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`);
  const { data } = await q;
  const rows = ((data as any) ?? []) as CloudCoupon[];
  const valid = rows.filter((r) => !r.expires_at || r.expires_at > now).filter((r) => !r.usage_limit || r.used_count < r.usage_limit);
  const cloudCoupons = valid.map(cloudToCoupon);
  // merge — cloud codes take precedence
  const codes = new Set(cloudCoupons.map((c) => c.code));
  return [...cloudCoupons, ...COUPONS.filter((c) => !codes.has(c.code))];
}

export async function findCoupon(code: string, restaurantId?: string | null): Promise<Coupon | undefined> {
  const list = await fetchAvailableCoupons(restaurantId);
  return list.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
}

export async function bumpCouponUsage(code: string) {
  try {
    const { data } = await supabase.from("coupons").select("id, used_count").eq("code", code).maybeSingle();
    if (data) {
      await supabase.from("coupons").update({ used_count: (data as any).used_count + 1 } as any).eq("id", (data as any).id);
    }
  } catch {}
}

// Owner CRUD
export async function fetchOwnerCoupons(rid: string): Promise<CloudCoupon[]> {
  const { data } = await supabase.from("coupons").select("*").eq("restaurant_id", rid).order("created_at", { ascending: false });
  return ((data as any) ?? []) as CloudCoupon[];
}

export async function createCoupon(c: Partial<CloudCoupon> & { restaurant_id: string; code: string; type: CloudCoupon["type"] }) {
  const { error } = await supabase.from("coupons").insert(c as any);
  if (error) throw error;
}

export async function updateCoupon(id: string, patch: Partial<CloudCoupon>) {
  const { error } = await supabase.from("coupons").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
}
