import { supabase } from "@/integrations/supabase/client";
const KEY = "quickbite_orders_v1";
export function loadOrders() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return [];
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
export function saveOrders(orders) {
    try {
        localStorage.setItem(KEY, JSON.stringify(orders));
    }
    catch { }
}
export function addOrder(order) {
    const all = loadOrders();
    all.unshift(order);
    saveOrders(all.slice(0, 50));
}
export function updateOrder(id, patch) {
    const all = loadOrders();
    const next = all.map((o) => (o.id === id ? { ...o, ...patch } : o));
    saveOrders(next);
    // best-effort cloud sync
    syncUpdateOrder(id, patch).catch(() => { });
}
// -------- Cloud sync (Supabase) --------
function rowToOrder(row) {
    return {
        id: row.id,
        items: row.items ?? [],
        subtotal: Number(row.subtotal),
        deliveryFee: Number(row.delivery_fee),
        discount: Number(row.discount),
        total: Number(row.total),
        placedAt: new Date(row.placed_at).getTime(),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        transactionId: row.transaction_id,
        razorpayOrderId: row.razorpay_order_id ?? undefined,
        razorpayPaymentId: row.razorpay_payment_id ?? undefined,
        couponCode: row.coupon_code ?? undefined,
        restaurantName: row.restaurant_name ?? undefined,
        status: row.status,
    };
}
export async function saveOrderToCloud(order) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user)
        return null;
    const { data, error } = await supabase
        .from("orders")
        .insert({
        user_id: user.id,
        items: order.items,
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        discount: order.discount,
        total: order.total,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        transaction_id: order.transactionId,
        razorpay_order_id: order.razorpayOrderId ?? null,
        razorpay_payment_id: order.razorpayPaymentId ?? null,
        coupon_code: order.couponCode ?? null,
        restaurant_name: order.restaurantName ?? null,
        restaurant_id: order.items[0]?.restaurantId ?? null,
        status: order.status,
    })
        .select()
        .single();
    if (error || !data)
        return null;
    return rowToOrder(data);
}
export async function fetchCloudOrders() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user)
        return null;
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("placed_at", { ascending: false })
        .limit(50);
    if (error || !data)
        return null;
    return data.map(rowToOrder);
}
async function syncUpdateOrder(id, patch) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user)
        return;
    const dbPatch = {};
    if (patch.status)
        dbPatch.status = patch.status;
    if (patch.paymentStatus)
        dbPatch.payment_status = patch.paymentStatus;
    if (!dbPatch.status && !dbPatch.payment_status)
        return;
    await supabase.from("orders").update(dbPatch).eq("id", id);
}
