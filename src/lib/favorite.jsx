import { createContext, useContext, useEffect, useState } from "react";
const Ctx = createContext(null);
const KEY = "quickbite_favs_v1";
export function FavoritesProvider({ children }) {
    const [dishes, setDishes] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                setDishes(parsed.dishes || []);
                setRestaurants(parsed.restaurants || []);
            }
        }
        catch { }
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem(KEY, JSON.stringify({ dishes, restaurants }));
        }
        catch { }
    }, [dishes, restaurants]);
    const toggleDish = (id) => setDishes((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
    const toggleRestaurant = (id) => setRestaurants((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
    return (<Ctx.Provider value={{
            dishes,
            restaurants,
            toggleDish,
            toggleRestaurant,
            isDishFav: (id) => dishes.includes(id),
            isRestaurantFav: (id) => restaurants.includes(id),
        }}>
      {children}
    </Ctx.Provider>);
}
export function useFavorites() {
    const c = useContext(Ctx);
    if (!c)
        throw new Error("useFavorites must be used inside FavoritesProvider");
    return c;
}
