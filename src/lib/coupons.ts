export type Coupon = {
  code: string;
  description: string;
  apply: (subtotal: number, deliveryFee: number) => { discount: number; freeDelivery: boolean };
  minOrder?: number;
};

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

export function findCoupon(code: string) {
  return COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
}
