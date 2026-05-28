import { sseBroker } from "@/lib/sse-broker";

export const dynamic = "force-dynamic";

export async function GET() {
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection verification frame
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ status: "idle", text: "Downlink active" })}\n\n`)
      );

      // Keepalive heartbeat interval
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Subscribe to all incoming proxy pulses
      unsubscribe = sseBroker.subscribe((data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          console.warn("[SSE Api] Failed to enqueue event payload:", e);
          clearInterval(heartbeatInterval);
          if (unsubscribe) unsubscribe();
        }
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    },
  });
}
