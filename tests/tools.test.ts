import { describe, expect, it } from "vitest";
import { createTools, returnEligibility } from "@/lib/tools";
import { ORDERS } from "@/lib/mock-data";
import { ops } from "@/lib/ops";

const tools = createTools("test");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (t: { execute?: any }, input: unknown) => t.execute!(input, { toolCallId: "t", messages: [] });

describe("lookupOrder", () => {
  it("returns the order when number and email match (any case, with #)", async () => {
    const r = await run(tools.lookupOrder, { orderNumber: "#1002", email: "LEO@example.com" });
    expect(r.found).toBe(true);
    expect(r.order.trackingNumber).toBe("1Z999AA10123456784");
    expect(JSON.stringify(r)).not.toContain("leo@example.com");
  });
  it("gives the same answer for a wrong email and a missing order", async () => {
    const wrong = await run(tools.lookupOrder, { orderNumber: "1002", email: "attacker@example.com" });
    const missing = await run(tools.lookupOrder, { orderNumber: "9999", email: "leo@example.com" });
    expect(wrong).toEqual(missing);
    expect(wrong.found).toBe(false);
  });
  it("records calls in the trace", () => {
    expect(ops.trace.some((e) => e.tool === "lookupOrder")).toBe(true);
  });
});

describe("returns", () => {
  const byNo = (n: string) => ORDERS.find((o) => o.orderNumber === n)!;
  it("applies the 30-day window and order status", () => {
    expect(returnEligibility(byNo("1003")).eligible).toBe(true);
    expect(returnEligibility(byNo("1004")).eligible).toBe(false);
    expect(returnEligibility(byNo("1002")).eligible).toBe(false);
    expect(returnEligibility(byNo("1005")).eligible).toBe(false);
  });
  it("creates a return only for items in an eligible order", async () => {
    const bad = await run(tools.startReturn, { orderNumber: "1004", email: "ana@example.com", items: ["Ember 2-Person Tent"], reason: "changed mind" });
    expect(bad.created).toBe(false);
    const ok = await run(tools.startReturn, { orderNumber: "1003", email: "sam@example.com", items: ["alpine gtx hiking boot"], reason: "too small" });
    expect(ok.created).toBe(true);
    expect(ops.returns[0].orderNumber).toBe("1003");
  });
});

describe("catalog and policies", () => {
  it("searches products with a budget", async () => {
    const r = await run(tools.searchProducts, { query: "waterproof hiking boots", maxPrice: 250 });
    expect(r.products[0].title).toBe("Alpine GTX Hiking Boot");
    expect(r.products.every((p: { price: number }) => p.price <= 250)).toBe(true);
  });
  it("returns policy text", async () => {
    const r = await run(tools.getPolicy, { topic: "shipping" });
    expect(r.policy).toContain("Canada");
  });
  it("creates a handoff ticket", async () => {
    const r = await run(tools.escalateToHuman, { summary: "Zipper broke after a week.", priority: "high" });
    expect(r.ticketId).toMatch(/^T-/);
    expect(r.expectedResponse).toBe("within 1 hour");
  });
});
