import { sseBroker } from "@/lib/sse-broker";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const status = body.status || "idle";
    const model = body.model || "Custom Emitter";
    const text = body.text || "";
    const tokens = body.tokens;
    const tools = body.tools;

    console.log(`[Pulse API] Intercepted direct telemetry pulse: status=${status}, model=${model}`);

    // Broadcast the pulse payload to all active browser EventSource connections
    sseBroker.broadcast(status, {
      model,
      text,
      tokens,
      tools,
      source: "cyberspace"
    });

    return Response.json({ success: true, broadcasted: true });
  } catch (error: any) {
    console.error("[Pulse API Exception]:", error);
    return Response.json(
      { error: { message: error.message || "Pulse transmission aborted due to internal server errors." } },
      { status: 500 }
    );
  }
}
