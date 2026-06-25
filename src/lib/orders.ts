import type { CartItem } from "./cart";

export type Order = {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  placedAt: number;
  paymentMethod: string;
  paymentStatus: "paid" | "pending";
  transactionId: string | null;
  couponCode?: string;
  restaurantName?: string;
  status: "preparing" | "out_for_delivery" | "delivered";
};

const KEY = "quickbite_orders_v1";

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {}
}

export function addOrder(order: Order) {
  const all = loadOrders();
  all.unshift(order);
  saveOrders(all.slice(0, 50));
}

export function updateOrder(id: string, patch: Partial<Order>) {
  const all = loadOrders();
  const next = all.map((o) => (o.id === id ? { ...o, ...patch } : o));
  saveOrders(next);
}
