import { describe, expect, it, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const finish = (reason: "stop" | "tool-calls") => ({ type: "finish" as const, finishReason: { unified: reason, raw: undefined }, logprobs: undefined, usage });

let script: "lookup" | "return" = "lookup";

vi.mock("@/lib/config", async (orig) => {
  const actual = await orig<typeof import("@/lib/config")>();
  return {
    ...actual,
    resolveProvider: () => "openai",
    chatModel: () => {
      const toolCall =
        script === "lookup"
          ? { toolName: "lookupOrder", input: JSON.stringify({ orderNumber: "1002", email: "leo@example.com" }) }
          : { toolName: "startReturn", input: JSON.stringify({ orderNumber: "1003", email: "sam@example.com", items: ["Alpine GTX Hiking Boot"], reason: "too small" }) };
      return new MockLanguageModelV4({
        doStream: [
          { stream: simulateReadableStream({ chunks: [{ type: "tool-call", toolCallId: "c1", ...toolCall }, finish("tool-calls")] }) },
          {
            stream: simulateReadableStream({
              chunks: [
                { type: "text-start", id: "t" },
                { type: "text-delta", id: "t", delta: "Your order has shipped with UPS." },
                { type: "text-end", id: "t" },
                finish("stop"),
              ],
            }),
          },
        ],
      });
    },
  };
});

async function post(text: string) {
  const { POST } = await import("@/app/api/chat/route");
  const res = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ conversationId: "c-test", messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }] }),
    }),
  );
  return res.text();
}

describe("POST /api/chat", () => {
  it("runs the tool loop: tool call, tool result, then the answer", async () => {
    script = "lookup";
    const body = await post("Where is order 1002? leo@example.com");
    expect(body).toContain('"toolName":"lookupOrder"');
    expect(body).toContain("1Z999AA10123456784");
    expect(body).toContain("Your order has shipped with UPS.");
  });

  it("pauses startReturn for customer approval instead of executing it", async () => {
    script = "return";
    const { ops } = await import("@/lib/ops");
    const before = ops.returns.length;
    const body = await post("Return my boots from 1003, sam@example.com, too small");
    expect(body).toContain("tool-approval-request");
    expect(ops.returns.length).toBe(before);
  });
});
