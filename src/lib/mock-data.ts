/**
 * Demo data for "Northpeak Outfitters", a fictional outdoor-gear store.
 * Used when no Shopify credentials are configured.
 */
export interface Product {
  id: string;
  title: string;
  category: "Jackets" | "Footwear" | "Packs" | "Camping" | "Accessories";
  price: number;
  inStock: number;
  tags: string[];
  description: string;
  image: string; // emoji stand-in so the demo has no image assets
}

export interface OrderLine {
  productId: string;
  title: string;
  quantity: number;
  price: number;
}

export interface Order {
  orderNumber: string;
  email: string;
  customerName: string;
  createdAt: string;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  deliveredAt?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  lines: OrderLine[];
  total: number;
}

export const PRODUCTS: Product[] = [
  { id: "p1", title: "Ridgeline Waterproof Shell", category: "Jackets", price: 189, inStock: 14, tags: ["waterproof", "rain", "hiking", "lightweight"], description: "3-layer waterproof, breathable shell with pit zips. Packs into its own pocket. 380 g.", image: "🧥" },
  { id: "p2", title: "Summit Down Parka", category: "Jackets", price: 279, inStock: 6, tags: ["warm", "winter", "down", "insulated"], description: "700-fill responsibly sourced down, rated to -15°C, with a helmet-compatible hood.", image: "🧥" },
  { id: "p3", title: "Trailbreaker Fleece", category: "Jackets", price: 79, inStock: 32, tags: ["fleece", "midlayer", "warm"], description: "Recycled grid fleece midlayer. Warm, breathable and quick drying.", image: "🧶" },
  { id: "p4", title: "Canyon Trail Runner", category: "Footwear", price: 139, inStock: 21, tags: ["trail running", "shoes", "lightweight", "grip"], description: "Lightweight trail shoe with 5 mm lugs and a rock plate. 290 g per shoe.", image: "👟" },
  { id: "p5", title: "Alpine GTX Hiking Boot", category: "Footwear", price: 229, inStock: 9, tags: ["boots", "waterproof", "hiking", "backpacking"], description: "Waterproof leather boot with ankle support for multi-day hikes. Resoleable.", image: "🥾" },
  { id: "p6", title: "Daybreak 24L Pack", category: "Packs", price: 99, inStock: 18, tags: ["daypack", "hiking", "hydration"], description: "24-litre daypack with hydration sleeve, hip belt pockets and rain cover.", image: "🎒" },
  { id: "p7", title: "Expedition 65L Pack", category: "Packs", price: 259, inStock: 4, tags: ["backpacking", "multi-day", "large"], description: "Adjustable-torso 65-litre pack for multi-day trips. Carries up to 25 kg comfortably.", image: "🎒" },
  { id: "p8", title: "Ember 2-Person Tent", category: "Camping", price: 329, inStock: 7, tags: ["tent", "backpacking", "lightweight", "2 person"], description: "Freestanding 3-season tent, 1.6 kg trail weight, two doors and two vestibules.", image: "⛺" },
  { id: "p9", title: "Glacier -7°C Sleeping Bag", category: "Camping", price: 199, inStock: 11, tags: ["sleeping bag", "warm", "camping"], description: "Synthetic mummy bag with a -7°C comfort limit. Stays warm when damp.", image: "🛌" },
  { id: "p10", title: "Pocket Stove Kit", category: "Camping", price: 59, inStock: 0, tags: ["stove", "cooking", "camping"], description: "Canister stove with 750 ml pot and windscreen. Boils 1 L in 4 minutes.", image: "🔥" },
  { id: "p11", title: "Merino Hiking Socks (3-pack)", category: "Accessories", price: 45, inStock: 60, tags: ["socks", "merino", "hiking"], description: "Cushioned merino wool socks that resist odour. Sizes S-XL.", image: "🧦" },
  { id: "p12", title: "Carbon Trekking Poles", category: "Accessories", price: 119, inStock: 13, tags: ["poles", "hiking", "lightweight"], description: "Foldable carbon poles, 240 g each, with cork grips and flick locks.", image: "🦯" },
];

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function order(o: Omit<Order, "total">): Order {
  return { ...o, total: o.lines.reduce((s, l) => s + l.price * l.quantity, 0) };
}

export const ORDERS: Order[] = [
  order({
    orderNumber: "1001",
    email: "maya@example.com",
    customerName: "Maya R.",
    createdAt: daysAgo(3),
    status: "processing",
    lines: [{ productId: "p1", title: "Ridgeline Waterproof Shell", quantity: 1, price: 189 }],
  }),
  order({
    orderNumber: "1002",
    email: "leo@example.com",
    customerName: "Leo K.",
    createdAt: daysAgo(6),
    status: "shipped",
    carrier: "UPS",
    trackingNumber: "1Z999AA10123456784",
    trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    lines: [
      { productId: "p4", title: "Canyon Trail Runner", quantity: 1, price: 139 },
      { productId: "p11", title: "Merino Hiking Socks (3-pack)", quantity: 2, price: 45 },
    ],
  }),
  order({
    orderNumber: "1003",
    email: "sam@example.com",
    customerName: "Sam T.",
    createdAt: daysAgo(18),
    status: "delivered",
    deliveredAt: daysAgo(12),
    carrier: "FedEx",
    trackingNumber: "794612345678",
    lines: [{ productId: "p5", title: "Alpine GTX Hiking Boot", quantity: 1, price: 229 }],
  }),
  order({
    orderNumber: "1004",
    email: "ana@example.com",
    customerName: "Ana P.",
    createdAt: daysAgo(52),
    status: "delivered",
    deliveredAt: daysAgo(47),
    carrier: "UPS",
    trackingNumber: "1Z999AA10987654321",
    lines: [{ productId: "p8", title: "Ember 2-Person Tent", quantity: 1, price: 329 }],
  }),
  order({
    orderNumber: "1005",
    email: "maya@example.com",
    customerName: "Maya R.",
    createdAt: daysAgo(9),
    status: "cancelled",
    lines: [{ productId: "p10", title: "Pocket Stove Kit", quantity: 1, price: 59 }],
  }),
];

export const POLICIES = {
  shipping:
    "Standard shipping is free on orders over $75 and takes 3-5 business days in the US. Express shipping costs $15 and takes 1-2 business days. Orders placed before 2 pm ET ship the same day. We ship to the US and Canada only.",
  returns:
    "Unused items in original condition can be returned within 30 days of delivery for a full refund to the original payment method. Return shipping is free with our prepaid label. Refunds are issued within 5 business days after the return arrives. Worn footwear and used camping stoves can't be returned unless faulty.",
  exchanges:
    "Size and colour exchanges are free within 30 days of delivery. Start a return and mention the new size; we ship the replacement as soon as the return is scanned by the carrier.",
  warranty:
    "All Northpeak gear has a 2-year warranty against manufacturing defects. Damage from normal wear, accidents or improper care isn't covered. Warranty claims are handled by our support team and need a photo of the defect.",
} as const;

export type PolicyTopic = keyof typeof POLICIES;
