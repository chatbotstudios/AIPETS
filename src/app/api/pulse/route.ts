import { sseBroker } from "@/lib/sse-broker";
import { pulseStore } from "@/lib/pulse-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/pulse — Receives telemetry pulses from VPS agents (Hermes, OpenClaw)
 * and stores them for browser polling. Also broadcasts via SSE broker for same-process listeners.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const status = body.status || "idle";
    const model = body.model || "Custom Emitter";
    const text = body.text || "";
    const tokens = body.tokens;
    const tools = body.tools;
    const source = body.source || "cyberspace";

    console.log(`[Pulse API] Intercepted telemetry pulse: status=${status}, model=${model}, source=${source}`);

    const pulseData = {
      model,
      text,
      tokens,
      tools,
      source
    };

    // Store the latest pulse for browser polling via GET
    pulseStore.set({ status, ...pulseData });

    // Also broadcast via SSE broker (works for same-process subscribers like platform/proxy routes)
    sseBroker.broadcast(status as any, pulseData);

    return Response.json({ success: true, broadcasted: true });
  } catch (error: any) {
    console.error("[Pulse API Exception]:", error);
    return Response.json(
      { error: { message: error.message || "Pulse transmission aborted due to internal server errors." } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pulse — Returns the latest stored pulse for browser short-polling.
 * The browser polls this every 2 seconds to pick up VPS telemetry pulses that
 * can't be delivered via SSE (due to Vercel serverless process isolation).
 *
 * Query params:
 *   ?after=<timestamp> — Only return pulse if it's newer than this timestamp.
 *                         Returns 204 No Content if no new pulse is available.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const afterParam = url.searchParams.get("after");
    const afterTs = afterParam ? parseInt(afterParam, 10) : 0;

    const latest = pulseStore.get();

    if (!latest) {
      return Response.json({ status: "idle", text: "No pulses received yet", timestamp: 0 });
    }

    // If client already has this pulse, return 204 No Content
    if (afterTs && latest.timestamp <= afterTs) {
      return new Response(null, { status: 204 });
    }

    return Response.json(latest);
  } catch (error: any) {
    console.error("[Pulse API GET Exception]:", error);
    return Response.json(
      { error: { message: error.message || "Failed to retrieve latest pulse." } },
      { status: 500 }
    );
  }
}
