import { useEffect, useState } from "react";
import type { Dish } from "./data";

const KEY = "quickbite_custom_dishes"; // { [restaurantId]: Dish[] }

type Store = Record<string, Dish[]>;

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("quickbite:custom-dishes"));
}

export function getCustomDishes(restaurantId: string): Dish[] {
  return read()[restaurantId] || [];
}

export function addCustomDish(restaurantId: string, dish: Omit<Dish, "id">) {
  const s = read();
  const list = s[restaurantId] || [];
  list.push({ ...dish, id: `c_${Date.now()}` });
  s[restaurantId] = list;
  write(s);
}

export function removeCustomDish(restaurantId: string, dishId: string) {
  const s = read();
  s[restaurantId] = (s[restaurantId] || []).filter((d) => d.id !== dishId);
  write(s);
}

export function useCustomDishes(restaurantId: string) {
  const [dishes, setDishes] = useState<Dish[]>([]);
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
