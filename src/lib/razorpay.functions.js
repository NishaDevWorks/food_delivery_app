import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// Create a Razorpay order (server-side, uses secret key).
export const createRazorpayOrder = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((data) => {
    if (!data || typeof data.amount !== "number" || data.amount <= 0) {
        throw new Error("Invalid amount");
    }
    return { amount: Math.round(data.amount), receipt: data.receipt };
})
    .handler(async ({ data }) => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    // Keep checkout usable in preview/demo environments where private Razorpay
    // credentials have not been added yet. The client opens its local demo flow.
    if (!keyId || !keySecret) {
        return {
            configured: false,
            mode: "demo",
            orderId: null,
            amount: data.amount * 100,
            currency: "INR",
            keyId: null,
        };
    }
    const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({
            amount: data.amount * 100, // paise
            currency: "INR",
            receipt: data.receipt ?? `qb_${Date.now()}`,
            payment_capture: 1,
        }),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Razorpay order failed: ${t}`);
    }
    const order = (await res.json());
    return { configured: true, mode: "live", orderId: order.id, amount: order.amount, currency: order.currency, keyId };
});
// Verify Razorpay payment signature (server-side).
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((data) => {
    if (!data?.orderId || !data?.paymentId || !data?.signature)
        throw new Error("Missing verification fields");
    return data;
})
    .handler(async ({ data }) => {
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keySecret)
        return { ok: false, reason: "not_configured" };
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", keySecret)
        .update(`${data.orderId}|${data.paymentId}`)
        .digest("hex");
    const ok = expected === data.signature;
    return { ok };
});
