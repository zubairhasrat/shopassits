import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from "ai";
import { chatModel, modelLabel, resolveProvider } from "@/lib/config";
import { createTools, type ShopMessage } from "@/lib/tools";

export const maxDuration = 60;

const SYSTEM = `You are the customer support assistant for Northpeak Outfitters, an outdoor gear store.
Today is ${"{{today}}"}.

How to help:
- Order questions: you need the order number AND the checkout email before calling lookupOrder. Never reveal order details without both.
- Policies: call getPolicy and answer from its text. Don't invent policies, prices or timelines.
- Product questions and recommendations: call searchProducts and recommend at most 3 items, mentioning price and whether they're in stock.
- Returns: first confirm the order with lookupOrder, then confirm which items and why, then call startReturn. The customer will be asked to approve it.
- Hand off to a human with escalateToHuman when the customer asks for a person, is upset, reports a defect or warranty issue, or you can't solve it.

Style: warm, brief, plain English. Use short paragraphs or bullets. Don't mention tools or internal steps by name.`;

export async function POST(req: Request) {
  const { messages, provider: requested, conversationId }: { messages: ShopMessage[]; provider?: string; conversationId?: string } =
    await req.json();

  const provider = resolveProvider(requested);
  if (!provider) {
    return Response.json(
      { error: "No AI provider configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env.local." },
      { status: 400 },
    );
  }

  const tools = createTools(conversationId?.slice(0, 64) || "anonymous");

  const result = streamText({
    model: chatModel(provider),
    system: SYSTEM.replace("{{today}}", new Date().toDateString()),
    messages: await convertToModelMessages(messages.slice(-20)),
    tools,
    toolApproval: { startReturn: { type: "user-approval", reason: "Creating a return needs your confirmation." } },
    experimental_toolApprovalSecret: process.env.TOOL_APPROVAL_SECRET,
    stopWhen: isStepCount(6),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      messageMetadata: ({ part }) => (part.type === "start" ? { model: modelLabel(provider) } : undefined),
    }),
  });
}
