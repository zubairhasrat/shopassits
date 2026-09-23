import { ops } from "@/lib/ops";

export async function GET(request: Request) {
  void request;
  return Response.json(ops);
}
