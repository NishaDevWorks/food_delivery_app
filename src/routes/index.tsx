import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickBite – Food Delivery" },
      { name: "description", content: "QuickBite mobile food delivery app — order from nearby restaurants in minutes." },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0" },
      { property: "og:title", content: "QuickBite – Food Delivery" },
      { property: "og:description", content: "Order food fast from your favorite local spots." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/quickbite.html"
      title="QuickBite"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
}
