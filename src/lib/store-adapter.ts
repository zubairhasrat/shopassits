import { ORDERS, PRODUCTS, type Order, type Product } from "./mock-data";

export interface StoreAdapter {
  name: "mock" | "shopify";
  getOrder(orderNumber: string): Promise<Order | null>;
  searchProducts(query: string, opts?: { maxPrice?: number; category?: string }): Promise<Product[]>;
}

const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

export const mockAdapter: StoreAdapter = {
  name: "mock",
  async getOrder(orderNumber) {
    const n = orderNumber.replace(/\D/g, "");
    return ORDERS.find((o) => o.orderNumber === n) ?? null;
  },
  async searchProducts(query, { maxPrice, category } = {}) {
    const q = words(query);
    const scored = PRODUCTS.map((p) => {
      const hay = words(`${p.title} ${p.category} ${p.tags.join(" ")} ${p.description}`);
      // Prefix matching so "boots" finds "boot" and "tents" finds "tent".
      const score = q.reduce((s, w) => s + (hay.some((h) => h.startsWith(w) || (h.length > 3 && w.startsWith(h))) ? 1 : 0), 0);
      return { p, score };
    }).filter(({ p }) => !maxPrice || p.price <= maxPrice);
    const top = Math.max(0, ...scored.map((x) => x.score));
    return scored
      .filter(({ score }) => q.length === 0 || (score > 0 && score >= top - 1))
      .filter(({ p }) => !category || p.category.toLowerCase() === category.toLowerCase())
      .sort((a, b) => b.score - a.score || a.p.price - b.p.price)
      .slice(0, 4)
      .map(({ p }) => p);
  },
};

/**
 * Shopify Admin GraphQL adapter. Enabled when SHOPIFY_STORE_DOMAIN and
 * SHOPIFY_ADMIN_TOKEN are set (scopes: read_orders, read_products).
 */
function shopifyAdapter(domain: string, token: string): StoreAdapter {
  const version = process.env.SHOPIFY_API_VERSION ?? "2025-07";
  async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(`Shopify API error: ${JSON.stringify(json.errors ?? res.status)}`);
    return json.data as T;
  }

  return {
    name: "shopify",
    async getOrder(orderNumber) {
      type R = {
        orders: {
          nodes: {
            name: string;
            email: string | null;
            createdAt: string;
            displayFulfillmentStatus: string;
            cancelledAt: string | null;
            customer: { displayName: string } | null;
            totalPriceSet: { shopMoney: { amount: string } };
            lineItems: { nodes: { title: string; quantity: number; originalUnitPriceSet: { shopMoney: { amount: string } }; product: { id: string } | null }[] };
            fulfillments: { deliveredAt: string | null; trackingInfo: { company: string | null; number: string | null; url: string | null }[] }[];
          }[];
        };
      };
      const n = orderNumber.replace(/\D/g, "");
      const data = await gql<R>(
        `query($q: String!) { orders(first: 1, query: $q) { nodes {
          name email createdAt displayFulfillmentStatus cancelledAt
          customer { displayName }
          totalPriceSet { shopMoney { amount } }
          lineItems(first: 20) { nodes { title quantity originalUnitPriceSet { shopMoney { amount } } product { id } } }
          fulfillments(first: 5) { deliveredAt trackingInfo { company number url } }
        } } }`,
        { q: `name:#${n}` },
      );
      const o = data.orders.nodes[0];
      if (!o) return null;
      const f = o.fulfillments[0];
      const t = f?.trackingInfo[0];
      const status: Order["status"] = o.cancelledAt
        ? "cancelled"
        : f?.deliveredAt
          ? "delivered"
          : o.displayFulfillmentStatus === "FULFILLED" || o.displayFulfillmentStatus === "IN_TRANSIT"
            ? "shipped"
            : "processing";
      return {
        orderNumber: n,
        email: o.email ?? "",
        customerName: o.customer?.displayName ?? "",
        createdAt: o.createdAt,
        status,
        deliveredAt: f?.deliveredAt ?? undefined,
        carrier: t?.company ?? undefined,
        trackingNumber: t?.number ?? undefined,
        trackingUrl: t?.url ?? undefined,
        lines: o.lineItems.nodes.map((l) => ({
          productId: l.product?.id ?? "",
          title: l.title,
          quantity: l.quantity,
          price: Number(l.originalUnitPriceSet.shopMoney.amount),
        })),
        total: Number(o.totalPriceSet.shopMoney.amount),
      };
    },
    async searchProducts(query, { maxPrice, category } = {}) {
      type R = {
        products: {
          nodes: {
            id: string;
            title: string;
            productType: string;
            tags: string[];
            description: string;
            totalInventory: number;
            priceRangeV2: { minVariantPrice: { amount: string } };
          }[];
        };
      };
      const parts = [query, category ? `product_type:${category}` : "", "status:active"].filter(Boolean);
      const data = await gql<R>(
        `query($q: String!) { products(first: 10, query: $q) { nodes {
          id title productType tags description totalInventory priceRangeV2 { minVariantPrice { amount } }
        } } }`,
        { q: parts.join(" ") },
      );
      return data.products.nodes
        .map((p) => ({
          id: p.id,
          title: p.title,
          category: (p.productType || "Accessories") as Product["category"],
          price: Number(p.priceRangeV2.minVariantPrice.amount),
          inStock: p.totalInventory,
          tags: p.tags,
          description: p.description.slice(0, 200),
          image: "🛍️",
        }))
        .filter((p) => !maxPrice || p.price <= maxPrice)
        .slice(0, 4);
    },
  };
}

export function getStore(): StoreAdapter {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  return domain && token ? shopifyAdapter(domain, token) : mockAdapter;
}
