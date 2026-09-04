import { createContext, useContext, useEffect, useState } from "react";
const Ctx = createContext(null);
const KEY = "quickbite_cart_v1";
export function CartProvider({ children }) {
    const [items, setItems] = useState([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw)
                setItems(JSON.parse(raw));
        }
        catch { }
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem(KEY, JSON.stringify(items));
        }
        catch { }
    }, [items]);
    const add = (it) => {
        setItems((prev) => {
            const found = prev.find((p) => p.id === it.id);
            if (found)
                return prev.map((p) => (p.id === it.id ? { ...p, qty: p.qty + 1 } : p));
            return [...prev, { ...it, qty: 1 }];
        });
    };
    const remove = (id) => setItems((p) => p.filter((i) => i.id !== id));
    const setQty = (id, qty) => {
        if (qty <= 0)
            return remove(id);
        setItems((p) => p.map((i) => (i.id === id ? { ...i, qty } : i)));
    };
    const clear = () => setItems([]);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const count = items.reduce((s, i) => s + i.qty, 0);
    return (<Ctx.Provider value={{ items, add, remove, setQty, clear, total, count }}>
      {children}
    </Ctx.Provider>);
}
export function useCart() {
    const ctx = useContext(Ctx);
    if (!ctx)
        throw new Error("useCart must be used inside CartProvider");
    return ctx;
}
