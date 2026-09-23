import { availableProviders, modelLabel } from "@/lib/config";
import { getStore } from "@/lib/store-adapter";

export async function GET(request: Request) {
  void request;
  return Response.json({
    providers: availableProviders().map((p) => ({ id: p, model: modelLabel(p) })),
    store: getStore().name,
  });
}
