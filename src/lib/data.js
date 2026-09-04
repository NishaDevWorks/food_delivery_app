const img = (id, w = 600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
export const restaurants = [
    {
        id: "spice-garden",
        name: "Spice Garden",
        cuisine: "Indian • Curry",
        rating: 4.8,
        eta: "25–30 min",
        emoji: "🍛",
        gradient: "from-orange-200 to-pink-200",
        image: img("photo-1585937421612-70a008356fbe"),
        priceLevel: 2,
        vegOnly: false,
        dishes: [
            { id: "d1", name: "Paneer Tikka", price: 220, emoji: "🧀", desc: "Smoky grilled cottage cheese", image: img("photo-1567188040759-fb8a883dc6d8", 300), veg: true },
            { id: "d2", name: "Butter Naan", price: 60, emoji: "🫓", desc: "Soft buttery flatbread", image: img("photo-1626074353765-517a681e40be", 300), veg: true },
            { id: "d3", name: "Dal Makhani", price: 180, emoji: "🥘", desc: "Creamy black lentils", image: img("photo-1546833999-b9f581a1996d", 300), veg: true },
            { id: "d4", name: "Chicken Biryani", price: 280, emoji: "🍚", desc: "Aromatic basmati rice", image: img("photo-1633945274309-2c16c9682cbd", 300), veg: false },
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
        image: img("photo-1579871494447-9811cf80d66c"),
        priceLevel: 3,
        vegOnly: false,
        dishes: [
            { id: "s1", name: "Salmon Nigiri", price: 320, emoji: "🍣", desc: "Fresh salmon over rice", image: img("photo-1617196034796-73dfa7b1fd56", 300), veg: false },
            { id: "s2", name: "Veggie Roll", price: 240, emoji: "🥒", desc: "Avocado cucumber roll", image: img("photo-1553621042-f6e147245754", 300), veg: true },
            { id: "s3", name: "Miso Soup", price: 120, emoji: "🍜", desc: "Warm soybean broth", image: img("photo-1607330289024-1535c6b4e1c1", 300), veg: true },
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
        image: img("photo-1513104890138-7c749659a591"),
        priceLevel: 2,
        vegOnly: false,
        dishes: [
            { id: "p1", name: "Margherita", price: 260, emoji: "🍕", desc: "Tomato, mozzarella, basil", image: img("photo-1604068549290-dea0e4a305ca", 300), veg: true },
            { id: "p2", name: "Pepperoni", price: 340, emoji: "🍕", desc: "Loaded pepperoni", image: img("photo-1628840042765-356cda07504e", 300), veg: false },
            { id: "p3", name: "Garlic Bread", price: 140, emoji: "🥖", desc: "Crisp & buttery", image: img("photo-1573140247632-f8fd74997d5c", 300), veg: true },
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
        image: img("photo-1512621776951-a57141f2eefd"),
        priceLevel: 1,
        vegOnly: true,
        dishes: [
            { id: "g1", name: "Quinoa Bowl", price: 290, emoji: "🥗", desc: "Quinoa, avocado, chickpeas", image: img("photo-1543339308-43e59d6b73a6", 300), veg: true },
            { id: "g2", name: "Berry Smoothie", price: 180, emoji: "🥤", desc: "Mixed berries & yogurt", image: img("photo-1502741338009-cac2772e18bc", 300), veg: true },
        ],
    },
];
export function findRestaurant(id) {
    return restaurants.find((r) => r.id === id);
}
