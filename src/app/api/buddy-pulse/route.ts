import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buddyIp, status, model, text, tokens, tools } = body;

    if (!buddyIp) {
      return NextResponse.json({ error: "Missing buddyIp parameter" }, { status: 400 });
    }

    // Map status from clawpets-web HUD to gemini-buddy-esp32 PersonaState values:
    // Expected statuses: "sleep", "idle", "busy", "attention", "celebrate", "dizzy", "heart"
    let buddyStatus = "idle";
    const statusLower = (status || "").toLowerCase();
    
    if (statusLower === "thinking" || statusLower === "connecting" || statusLower === "tool_calls" || statusLower === "busy") {
      buddyStatus = "busy";
    } else if (statusLower === "success" || statusLower === "celebrate") {
      buddyStatus = "celebrate";
    } else if (statusLower === "error" || statusLower === "attention") {
      buddyStatus = "attention";
    } else if (statusLower === "sleeping" || statusLower === "sleep") {
      buddyStatus = "sleep";
    } else if (statusLower === "dizzy") {
      buddyStatus = "dizzy";
    } else if (statusLower === "heart") {
      buddyStatus = "heart";
    }

    let buddyUrl = `http://${buddyIp}:81/pulse`;
    if (buddyIp.includes(":")) {
      buddyUrl = `http://${buddyIp}/pulse`;
    }
    console.log(`[Buddy Pulse Proxy] Relaying pulse to physical buddy at ${buddyUrl}: status=${buddyStatus}`);

    // Send HTTP POST to ESP32 WebServer
    const response = await fetch(buddyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: buddyStatus,
        model: model || "Cyberspace",
        text: text || "",
        tokens: tokens || 0,
        tools: tools || ""
      }),
      // Set a short timeout so we don't hang if the buddy is offline
      signal: AbortSignal.timeout(2000)
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errText = await response.text();
      return NextResponse.json({ error: `Buddy responded with status ${response.status}: ${errText}` }, { status: 502 });
    }
  } catch (error: any) {
    console.warn(`[Buddy Pulse Proxy] Failed to relay pulse to buddy:`, error.message);
    return NextResponse.json({ error: error.message || "Failed to contact buddy" }, { status: 500 });
  }
}
