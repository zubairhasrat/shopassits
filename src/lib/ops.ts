import { randomUUID } from "crypto";

/** In-memory operational records: tool-call trace, support tickets, return requests. */
export interface TraceEntry {
  id: string;
  conversationId: string;
  tool: string;
  input: unknown;
  output: unknown;
  ok: boolean;
  ms: number;
  at: string;
}

export interface Ticket {
  id: string;
  conversationId: string;
  priority: "normal" | "high";
  customerEmail?: string;
  summary: string;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderNumber: string;
  email: string;
  items: string[];
  reason: string;
  status: "requested";
  createdAt: string;
}

interface Ops {
  trace: TraceEntry[];
  tickets: Ticket[];
  returns: ReturnRequest[];
}

const g = globalThis as unknown as { __shopassistOps?: Ops };
export const ops: Ops = (g.__shopassistOps ??= { trace: [], tickets: [], returns: [] });

export function record(entry: Omit<TraceEntry, "id" | "at">) {
  ops.trace.unshift({ ...entry, id: randomUUID(), at: new Date().toISOString() });
  ops.trace.length = Math.min(ops.trace.length, 200);
}

export function addTicket(t: Omit<Ticket, "id" | "createdAt">) {
  const ticket = { ...t, id: `T-${1000 + ops.tickets.length + 1}`, createdAt: new Date().toISOString() };
  ops.tickets.unshift(ticket);
  return ticket;
}

export function addReturn(r: Omit<ReturnRequest, "id" | "createdAt" | "status">) {
  const req: ReturnRequest = { ...r, id: `R-${2000 + ops.returns.length + 1}`, status: "requested", createdAt: new Date().toISOString() };
  ops.returns.unshift(req);
  return req;
}
