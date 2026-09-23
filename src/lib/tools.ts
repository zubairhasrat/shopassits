import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { POLICIES, type Order } from "./mock-data";
import { getStore, type StoreAdapter } from "./store-adapter";
import { addReturn, addTicket, record } from "./ops";

export const RETURN_WINDOW_DAYS = 30;

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** What the customer (and the model) may see about an order: no email or internal ids. */
function publicOrder(o: Order) {
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    placedOn: o.createdAt.slice(0, 10),
    deliveredOn: o.deliveredAt?.slice(0, 10),
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    items: o.lines.map((l) => ({ title: l.title, quantity: l.quantity, price: l.price })),
    total: o.total,
  };
}

export function returnEligibility(o: Order, now = Date.now()) {
  if (o.status === "cancelled") return { eligible: false, reason: "This order was cancelled, so there is nothing to return." };
  if (o.status !== "delivered" || !o.deliveredAt)
    return { eligible: false, reason: "The order hasn't been delivered yet. Returns open once it arrives." };
  const days = Math.floor((now - new Date(o.deliveredAt).getTime()) / 86_400_000);
  if (days > RETURN_WINDOW_DAYS)
    return {
      eligible: false,
      reason: `It was delivered ${days} days ago, past the ${RETURN_WINDOW_DAYS}-day return window. Warranty claims may still apply.`,
    };
  return { eligible: true, reason: `Delivered ${days} days ago, within the ${RETURN_WINDOW_DAYS}-day window.` };
}

/** Wraps a tool's execute function to write every call to the ops trace. */
function traced<I, O>(conversationId: string, name: string, fn: (input: I) => Promise<O>) {
  return async (input: I): Promise<O> => {
    const started = Date.now();
    try {
      const output = await fn(input);
      record({ conversationId, tool: name, input, output, ok: true, ms: Date.now() - started });
      return output;
    } catch (e) {
      const output = { error: e instanceof Error ? e.message : String(e) };
      record({ conversationId, tool: name, input, output, ok: false, ms: Date.now() - started });
      throw e;
    }
  };
}

export function createTools(conversationId: string, store: StoreAdapter = getStore()) {
  return {
    lookupOrder: tool({
      description:
        "Look up an order's status, items and tracking. Requires BOTH the order number and the email used at checkout; ask the customer for any that are missing.",
      inputSchema: z.object({
        orderNumber: z.string().describe("Order number, e.g. 1002 or #1002"),
        email: z.string().email().describe("Email address used for the order"),
      }),
      execute: traced(conversationId, "lookupOrder", async ({ orderNumber, email }: { orderNumber: string; email: string }) => {
        const o = await store.getOrder(orderNumber);
        // Same response for "not found" and "wrong email" so order numbers can't be probed.
        if (!o || !sameEmail(o.email, email))
          return { found: false as const, message: "No order matches that order number and email." };
        return { found: true as const, order: publicOrder(o), returns: returnEligibility(o) };
      }),
    }),

    searchProducts: tool({
      description: "Search the product catalog to recommend items. Use for any product question or recommendation.",
      inputSchema: z.object({
        query: z.string().describe("What the customer is looking for, e.g. 'waterproof hiking boots'"),
        maxPrice: z.number().positive().optional().describe("Maximum price in USD, if the customer mentioned a budget"),
        category: z.enum(["Jackets", "Footwear", "Packs", "Camping", "Accessories"]).optional(),
      }),
      execute: traced(
        conversationId,
        "searchProducts",
        async ({ query, maxPrice, category }: { query: string; maxPrice?: number; category?: string }) => {
          const products = await store.searchProducts(query, { maxPrice, category });
          return {
            products: products.map((p) => ({
              id: p.id,
              title: p.title,
              price: p.price,
              inStock: p.inStock > 0,
              description: p.description,
              image: p.image,
            })),
          };
        },
      ),
    }),

    getPolicy: tool({
      description: "Get the store's official policy text. Always use this before answering questions about shipping, returns, exchanges or warranty.",
      inputSchema: z.object({ topic: z.enum(["shipping", "returns", "exchanges", "warranty"]) }),
      execute: traced(conversationId, "getPolicy", async ({ topic }: { topic: keyof typeof POLICIES }) => ({
        topic,
        policy: POLICIES[topic],
      })),
    }),

    startReturn: tool({
      description:
        "Create a return request for items in a delivered order. Only call after lookupOrder confirmed the order and the customer said which items and why. The customer must approve before it runs.",
      inputSchema: z.object({
        orderNumber: z.string(),
        email: z.string().email(),
        items: z.array(z.string()).min(1).describe("Titles of the items to return"),
        reason: z.string().describe("Customer's reason, e.g. 'too small', 'changed my mind'"),
      }),
      execute: traced(
        conversationId,
        "startReturn",
        async ({ orderNumber, email, items, reason }: { orderNumber: string; email: string; items: string[]; reason: string }) => {
          const o = await store.getOrder(orderNumber);
          if (!o || !sameEmail(o.email, email)) return { created: false as const, message: "No order matches that order number and email." };
          const check = returnEligibility(o);
          if (!check.eligible) return { created: false as const, message: check.reason };
          const valid = items.filter((i) => o.lines.some((l) => l.title.toLowerCase() === i.toLowerCase()));
          if (!valid.length) return { created: false as const, message: "None of those items are in this order." };
          const req = addReturn({ orderNumber: o.orderNumber, email: o.email, items: valid, reason });
          return {
            created: true as const,
            returnId: req.id,
            items: valid,
            nextSteps: "A prepaid return label is on its way by email. Refunds are issued within 5 business days after the return arrives.",
          };
        },
      ),
    }),

    escalateToHuman: tool({
      description:
        "Hand the conversation to a human agent. Use when the customer asks for a person, is upset, reports a defect or warranty issue, or when you can't resolve the request with the other tools.",
      inputSchema: z.object({
        summary: z.string().describe("Two or three sentences a human agent can act on without rereading the chat"),
        customerEmail: z.string().email().optional(),
        priority: z.enum(["normal", "high"]).default("normal"),
      }),
      execute: traced(
        conversationId,
        "escalateToHuman",
        async ({ summary, customerEmail, priority }: { summary: string; customerEmail?: string; priority?: "normal" | "high" }) => {
          const t = addTicket({ conversationId, summary, customerEmail, priority: priority ?? "normal" });
          return { ticketId: t.id, expectedResponse: priority === "high" ? "within 1 hour" : "within 4 business hours" };
        },
      ),
    }),
  };
}

export type ShopTools = ReturnType<typeof createTools>;
export type ShopMessage = UIMessage<{ model?: string }, never, InferUITools<ShopTools>>;
