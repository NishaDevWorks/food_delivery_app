import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Smartphone, CreditCard, Wallet, Banknote, Check, Tag, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useCart } from "@/lib/cart";
import { findCoupon, COUPONS } from "@/lib/coupons";
import { addOrder, type Order } from "@/lib/orders";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your Cart – QuickBite" }],
  }),
  component: CartPage,
});

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", desc: "Google Pay, PhonePe, Paytm", Icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard, Rupay", Icon: CreditCard },
  { id: "wallet", label: "Wallet", desc: "Paytm, Amazon Pay", Icon: Wallet },
  { id: "cod", label: "Cash on Delivery", desc: "Pay when it arrives", Icon: Banknote },
] as const;

function CartPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const navigate = useNavigate();
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<"choose" | "details">("choose");
  const [method, setMethod] = useState<string>("upi");
  const [paying, setPaying] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; freeDelivery: boolean } | null>(null);
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [walletPhone, setWalletPhone] = useState("");


  const baseDelivery = items.length ? 30 : 0;
  const deliveryFee = applied?.freeDelivery ? 0 : baseDelivery;
  const discount = applied?.discount ?? 0;
  const grand = Math.max(0, total + deliveryFee - discount);

  function applyCoupon(input?: string) {
    const c = findCoupon(input ?? code);
    if (!c) {
      toast.error("Invalid coupon code");
      return;
    }
    if (c.minOrder && total < c.minOrder) {
      toast.error(`Add ₹${c.minOrder - total} more to use ${c.code}`);
      return;
    }
    const result = c.apply(total, baseDelivery);
    if (result.discount === 0 && !result.freeDelivery) {
      toast.error("Coupon not applicable");
      return;
    }
    setApplied({ code: c.code, discount: result.discount, freeDelivery: result.freeDelivery });
    setCode(c.code);
    toast.success(`${c.code} applied`);
  }

  function removeCoupon() {
    setApplied(null);
    setCode("");
  }

  function openPayment() {
    if (!items.length) return;
    setPayStep("choose");
    setPayOpen(true);
  }

  function proceedToDetails() {
    if (method === "cod") {
      placeOrder();
      return;
    }
    setPayStep("details");
  }

  function validateDetails(): string | null {
    if (method === "upi") {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) return "Enter a valid UPI ID (e.g. name@upi)";
    } else if (method === "card") {
      const num = cardNumber.replace(/\s/g, "");
      if (!/^\d{16}$/.test(num)) return "Card number must be 16 digits";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) return "Expiry must be MM/YY";
      if (!/^\d{3,4}$/.test(cardCvv)) return "CVV must be 3-4 digits";
      if (cardName.trim().length < 2) return "Enter cardholder name";
    } else if (method === "wallet") {
      if (!/^\d{10}$/.test(walletPhone)) return "Enter a valid 10-digit mobile number";
    }
    return null;
  }

  function submitPayment() {
    const err = validateDetails();
    if (err) {
      toast.error(err);
      return;
    }
    placeOrder();
  }

  function placeOrder() {
    setPaying(true);
    const chosen = PAYMENT_METHODS.find((m) => m.id === method);
    const isCod = method === "cod";
    const delay = isCod ? 700 : 1500;
    setTimeout(() => {
      const txnId = "QB" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const order: Order = {
        id: txnId,
        items,
        subtotal: total,
        deliveryFee,
        discount,
        total: grand,
        placedAt: Date.now(),
        paymentMethod: chosen?.label ?? "UPI",
        paymentStatus: isCod ? "pending" : "paid",
        transactionId: isCod ? null : txnId,
        couponCode: applied?.code,
        restaurantName: items[0]?.restaurantName,
        status: "preparing",
      };
      try {
        addOrder(order);
        localStorage.setItem("quickbite_active_order", JSON.stringify(order));
      } catch {}
      clear();
      setPaying(false);
      setPayOpen(false);
      toast.success(
        isCod
          ? "Order placed! Pay cash on delivery."
          : `Payment successful via ${chosen?.label}`,
      );
      navigate({ to: "/track" });
    }, delay);
  }

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3">
          <Link to="/home" className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-xl font-black text-slate-900">Your Cart</h1>
        </div>

        {items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-white" />
            </div>
            <p className="mt-4 font-semibold text-slate-800">Your cart is empty</p>
            <p className="text-sm text-slate-500">Add some delicious dishes to get started.</p>
            <Link
              to="/home"
              className="mt-6 px-6 h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center shadow-md shadow-pink-200"
            >
              Browse restaurants
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-3">
              {items.map((i) => (
                <div key={i.id} className="bg-white/90 rounded-2xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {i.image ? (
                      <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">{i.emoji}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{i.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{i.restaurantName}</p>
                    <p className="text-sm font-bold text-violet-600">₹{i.price * i.qty}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={() => remove(i.id)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-full px-1">
                      <button onClick={() => setQty(i.id, i.qty - 1)} className="w-6 h-6 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)} className="w-6 h-6 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon section */}
            <div className="mt-5 bg-white/90 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-violet-600" />
                <p className="text-sm font-bold text-slate-800">Promo code</p>
              </div>
              {applied ? (
                <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                  <div>
                    <p className="text-sm font-bold text-emerald-700">{applied.code} applied</p>
                    <p className="text-[11px] text-emerald-600">
                      You saved ₹{(applied.discount + (applied.freeDelivery ? baseDelivery : 0))}
                    </p>
                  </div>
                  <button onClick={removeCoupon} className="text-emerald-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <button
                      onClick={() => applyCoupon()}
                      className="px-4 h-10 rounded-xl bg-violet-500 text-white text-sm font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {COUPONS.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => applyCoupon(c.code)}
                        className="w-full flex items-center justify-between text-left p-2 rounded-lg hover:bg-violet-50"
                      >
                        <div>
                          <p className="text-xs font-bold text-violet-700">{c.code}</p>
                          <p className="text-[10px] text-slate-500">{c.description}</p>
                        </div>
                        <span className="text-[10px] text-violet-600 font-semibold">Apply</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 bg-white/90 rounded-2xl p-4 shadow-sm space-y-2 text-sm">
              <Row label="Subtotal" value={`₹${total}`} />
              <Row label="Delivery" value={deliveryFee === 0 && baseDelivery > 0 ? "FREE" : `₹${deliveryFee}`} />
              {discount > 0 && <Row label={`Discount (${applied?.code})`} value={`-₹${discount}`} accent />}
              <div className="h-px bg-slate-200 my-1" />
              <Row label="Total" value={`₹${grand}`} bold />
            </div>

            <button
              onClick={openPayment}
              className="mt-5 w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold shadow-lg shadow-pink-200 active:scale-[0.98] transition"
            >
              Place order · ₹{grand}
            </button>
          </>
        )}
      </div>

      <Dialog open={payOpen} onOpenChange={(o) => { setPayOpen(o); if (!o) setPayStep("choose"); }}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          {payStep === "choose" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900">Choose payment</DialogTitle>
                <DialogDescription>Select how you'd like to pay ₹{grand}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-2">
                {PAYMENT_METHODS.map(({ id, label, desc, Icon }) => {
                  const active = method === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setMethod(id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition text-left ${
                        active ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-gradient-to-br from-violet-500 to-pink-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800">{label}</p>
                        <p className="text-[11px] text-slate-500 truncate">{desc}</p>
                      </div>
                      {active && <Check className="w-5 h-5 text-violet-600" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={proceedToDetails}
                disabled={paying}
                className="mt-3 w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold shadow-lg shadow-pink-200 active:scale-[0.98] transition disabled:opacity-60"
              >
                {paying ? "Processing…" : method === "cod" ? `Confirm order · ₹${grand}` : `Continue`}
              </button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900">
                  {method === "upi" ? "Enter UPI ID" : method === "card" ? "Card details" : "Wallet mobile number"}
                </DialogTitle>
                <DialogDescription>Paying ₹{grand} · {PAYMENT_METHODS.find(m => m.id === method)?.label}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {method === "upi" && (
                  <input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full h-12 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                )}
                {method === "card" && (
                  <>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "))}
                      placeholder="Card number"
                      inputMode="numeric"
                      className="w-full h-12 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                          setCardExpiry(v);
                        }}
                        placeholder="MM/YY"
                        className="h-12 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                      <input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="CVV"
                        type="password"
                        className="h-12 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                    <input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Cardholder name"
                      className="w-full h-12 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </>
                )}
                {method === "wallet" && (
                  <input
                    value={walletPhone}
                    onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    className="w-full h-12 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                )}
                <p className="text-[11px] text-slate-400 text-center">🔒 Demo checkout — no real charge is made</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setPayStep("choose")}
                  disabled={paying}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={submitPayment}
                  disabled={paying}
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold shadow-lg shadow-pink-200 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {paying ? "Processing…" : `Pay ₹${grand}`}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </MobileShell>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-slate-900" : accent ? "text-emerald-600 font-semibold" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
