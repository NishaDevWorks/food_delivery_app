import { useEffect, useState } from "react";
const KEY = "quickbite_custom_dishes"; // { [restaurantId]: Dish[] }
function read() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "{}");
    }
    catch {
        return {};
    }
}
function write(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("quickbite:custom-dishes"));
}
export function getCustomDishes(restaurantId) {
    return read()[restaurantId] || [];
}
export function addCustomDish(restaurantId, dish) {
    const s = read();
    const list = s[restaurantId] || [];
    list.push({ ...dish, id: `c_${Date.now()}` });
    s[restaurantId] = list;
    write(s);
}
export function removeCustomDish(restaurantId, dishId) {
    const s = read();
    s[restaurantId] = (s[restaurantId] || []).filter((d) => d.id !== dishId);
    write(s);
}
export function useCustomDishes(restaurantId) {
    const [dishes, setDishes] = useState([]);
    useEffect(() => {
        const sync = () => setDishes(getCustomDishes(restaurantId));
        sync();
        window.addEventListener("quickbite:custom-dishes", sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("quickbite:custom-dishes", sync);
            window.removeEventListener("storage", sync);
        };
    }, [restaurantId]);
    return dishes;
}
