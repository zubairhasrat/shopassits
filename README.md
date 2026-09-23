# ShopAssist: AI support agent for e-commerce

A customer-support agent for an online store that **takes real actions** with tool calling: it looks up orders, recommends products, answers from official policies, starts returns (only after the customer approves), and hands off to a human with a written summary. Every tool call is logged to an operations dashboard.

Built with Next.js 16, TypeScript, Tailwind CSS and the Vercel AI SDK. Works with **OpenAI or Anthropic Claude**, and with the **Shopify Admin API** or built-in sample data.

<!-- Add screenshots after running with your API key: docs/chat.png, docs/admin.png -->

## What the agent can do

| Tool | What it does | Guardrail |
| --- | --- | --- |
| `lookupOrder` | Status, items, carrier and tracking link | Needs order number **and** checkout email; identical response for "not found" and "wrong email" so order numbers can't be probed; email never returned to the model |
| `searchProducts` | Catalog search with budget and category filters | Returns at most 4 items, with stock status |
| `getPolicy` | Shipping, returns, exchanges, warranty text | The model must quote policy instead of inventing it |
| `startReturn` | Creates a return request | **Customer approval required** (AI SDK tool approval), 30-day window and item checks on the server, optional signed approvals (`TOOL_APPROVAL_SECRET`) |
| `escalateToHuman` | Creates a ticket with a summary and priority | Used for upset customers, defects, warranty or anything unresolved |

The demo store is **Northpeak Outfitters**, a fictional outdoor-gear shop. `/admin` shows the live tool-call trace (input, output, latency), handoff tickets and return requests.

## Quick start

```bash
npm install
cp .env.example .env.local   # add OPENAI_API_KEY and/or ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Try these in the chat widget:

- "Where's my order #1002? Email: leo@example.com"
- "I need waterproof hiking boots under $250"
- "I want to return the boots from order 1003, they're too small. Email sam@example.com" → approve the return in the chat
- "My tent pole snapped after two trips" → handoff to a human
- Then open **/admin** to see every tool call.

Sample orders: `1001` maya@example.com (processing), `1002` leo@example.com (shipped), `1003` sam@example.com (delivered, returnable), `1004` ana@example.com (delivered, outside the return window), `1005` maya@example.com (cancelled).

```bash
npm test          # tool guardrails + agent loop with a mock model
npm run typecheck
npm run build
```

## Connecting Shopify

Create a custom app in your Shopify admin with `read_orders` and `read_products` scopes, then set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_TOKEN`. Order lookups and product search then use the Admin GraphQL API (`src/lib/store-adapter.ts`). Return requests and tickets stay in the app's own store; wire `addReturn`/`addTicket` in `src/lib/ops.ts` to your helpdesk (Gorgias, Zendesk, Brightdesk…) for production.

## Architecture

```
Chat widget (useChat) ──> /api/chat ──> streamText + tools, up to 6 steps
                                        ├─ lookupOrder / searchProducts ──> StoreAdapter (sample | Shopify)
                                        ├─ getPolicy
                                        ├─ startReturn  (paused for customer approval)
                                        └─ escalateToHuman
                     every call ──> ops trace ──> /admin
```

Operational data is in memory for the demo; use Postgres/Redis in production.

## License

MIT
