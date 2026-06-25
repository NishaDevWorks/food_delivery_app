import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type FavCtx = {
  dishes: string[]; // dish ids
  restaurants: string[]; // restaurant ids
  toggleDish: (id: string) => void;
  toggleRestaurant: (id: string) => void;
  isDishFav: (id: string) => boolean;
  isRestaurantFav: (id: string) => boolean;
};

const Ctx = createContext<FavCtx | null>(null);
const KEY = "quickbite_favs_v1";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [dishes, setDishes] = useState<string[]>([]);
  const [restaurants, setRestaurants] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDishes(parsed.dishes || []);
        setRestaurants(parsed.restaurants || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ dishes, restaurants }));
    } catch {}
  }, [dishes, restaurants]);

  const toggleDish = (id: string) =>
    setDishes((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const toggleRestaurant = (id: string) =>
    setRestaurants((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <Ctx.Provider
      value={{
        dishes,
        restaurants,
        toggleDish,
        toggleRestaurant,
        isDishFav: (id) => dishes.includes(id),
        isRestaurantFav: (id) => restaurants.includes(id),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFavorites() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFavorites must be used inside FavoritesProvider");
  return c;
}
