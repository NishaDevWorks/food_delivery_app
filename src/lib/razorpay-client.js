// Loads Razorpay Checkout.js on demand and opens the real checkout modal.
// Server issues the order + verifies the signature; the browser only opens the sheet.
let loadPromise = null;
export function loadRazorpay() {
    if (typeof window === "undefined")
        return Promise.reject(new Error("no window"));
    if (window.Razorpay)
        return Promise.resolve();
    if (loadPromise)
        return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
            loadPromise = null;
            reject(new Error("Failed to load Razorpay"));
        };
        document.body.appendChild(s);
    });
    return loadPromise;
}
export function openRazorpay(args) {
    return new Promise((resolve, reject) => {
        if (!window.Razorpay) {
            reject(new Error("Razorpay not loaded"));
            return;
        }
        const rzp = new window.Razorpay({
            key: args.keyId,
            order_id: args.orderId,
            amount: args.amount,
            currency: args.currency,
            name: args.name,
            description: args.description ?? "Order payment",
            prefill: args.prefill,
            theme: { color: args.themeColor ?? "#8b5cf6" },
            handler: (resp) => resolve(resp),
            modal: {
                ondismiss: () => reject(new Error("Payment cancelled")),
                escape: true,
                confirm_close: true,
            },
        });
        rzp.on("payment.failed", (resp) => {
            reject(new Error(resp?.error?.description || "Payment failed"));
        });
        rzp.open();
    });
}
