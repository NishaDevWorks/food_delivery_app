export type Dish = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  desc: string;
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  eta: string;
  emoji: string;
  gradient: string;
  dishes: Dish[];
};

export const restaurants: Restaurant[] = [
  {
    id: "spice-garden",
    name: "Spice Garden",
    cuisine: "Indian • Curry",
    rating: 4.8,
    eta: "25–30 min",
    emoji: "🍛",
    gradient: "from-orange-200 to-pink-200",
    dishes: [
      { id: "d1", name: "Paneer Tikka", price: 220, emoji: "🧀", desc: "Smoky grilled cottage cheese" },
      { id: "d2", name: "Butter Naan", price: 60, emoji: "🫓", desc: "Soft buttery flatbread" },
      { id: "d3", name: "Dal Makhani", price: 180, emoji: "🥘", desc: "Creamy black lentils" },
      { id: "d4", name: "Chicken Biryani", price: 280, emoji: "🍚", desc: "Aromatic basmati rice" },
    ],
  },
  {
    id: "sushi-wave",
    name: "Sushi Wave",
    cuisine: "Japanese • Sushi",
    rating: 4.7,
    eta: "30–40 min",
    emoji: "🍣",
    gradient: "from-sky-200 to-indigo-200",
    dishes: [
      { id: "s1", name: "Salmon Nigiri", price: 320, emoji: "🍣", desc: "Fresh salmon over rice" },
      { id: "s2", name: "Veggie Roll", price: 240, emoji: "🥒", desc: "Avocado cucumber roll" },
      { id: "s3", name: "Miso Soup", price: 120, emoji: "🍜", desc: "Warm soybean broth" },
    ],
  },
  {
    id: "pizza-cloud",
    name: "Pizza Cloud",
    cuisine: "Italian • Pizza",
    rating: 4.6,
    eta: "20–25 min",
    emoji: "🍕",
    gradient: "from-yellow-200 to-orange-200",
    dishes: [
      { id: "p1", name: "Margherita", price: 260, emoji: "🍕", desc: "Tomato, mozzarella, basil" },
      { id: "p2", name: "Pepperoni", price: 340, emoji: "🍕", desc: "Loaded pepperoni" },
      { id: "p3", name: "Garlic Bread", price: 140, emoji: "🥖", desc: "Crisp & buttery" },
    ],
  },
  {
    id: "green-bowl",
    name: "Green Bowl",
    cuisine: "Healthy • Salads",
    rating: 4.9,
    eta: "15–20 min",
    emoji: "🥗",
    gradient: "from-green-200 to-emerald-200",
    dishes: [
      { id: "g1", name: "Quinoa Bowl", price: 290, emoji: "🥗", desc: "Quinoa, avocado, chickpeas" },
      { id: "g2", name: "Berry Smoothie", price: 180, emoji: "🥤", desc: "Mixed berries & yogurt" },
    ],
  },
];

export function findRestaurant(id: string) {
  return restaurants.find((r) => r.id === id);
}
