type SSEClient = (message: any) => void;

interface GlobalWithSSEBroker {
  _sseClients?: Set<SSEClient>;
}

const g = global as unknown as GlobalWithSSEBroker;

if (!g._sseClients) {
  g._sseClients = new Set<SSEClient>();
}

export const sseBroker = {
  subscribe(client: SSEClient) {
    if (g._sseClients) {
      g._sseClients.add(client);
    }
    return () => {
      if (g._sseClients) {
        g._sseClients.delete(client);
      }
    };
  },

  broadcast(status: 'idle' | 'connecting' | 'thinking' | 'tool_calls' | 'success' | 'error', data: any = {}) {
    if (g._sseClients) {
      const payload = {
        status,
        timestamp: Date.now(),
        ...data
      };
      
      console.log(`[SSE Broker] Broadcasting status: ${status} to ${g._sseClients.size} subscribers.`);
      
      g._sseClients.forEach((send) => {
        try {
          send(payload);
        } catch (err) {
          console.warn("[SSE Broker] Error writing to subscriber stream:", err);
        }
      });
    }

    // Auto-relay server-side pulses to physical buddy if BUDDY_IP is set in .env
    const buddyIp = process.env.BUDDY_IP;
    if (buddyIp) {
      let buddyStatus = "idle";
      if (status === "thinking" || status === "connecting" || status === "tool_calls") {
        buddyStatus = "busy";
      } else if (status === "success") {
        buddyStatus = "celebrate";
      } else if (status === "error") {
        buddyStatus = "attention";
      }

      let buddyUrl = `http://${buddyIp}:81/pulse`;
      if (buddyIp.includes(":")) {
        buddyUrl = `http://${buddyIp}/pulse`;
      }
      console.log(`[SSE Broker] Auto-relaying pulse to physical buddy at ${buddyUrl}: status=${buddyStatus}`);

      fetch(buddyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: buddyStatus,
          model: data.model || "Cyberspace",
          text: data.text || "",
          tokens: data.tokens || 0,
          tools: data.tools || ""
        }),
        signal: AbortSignal.timeout(2000)
      }).catch((err) => {
        console.warn(`[SSE Broker] Failed to auto-relay pulse to physical buddy at ${buddyIp}:`, err.message);
      });
    }
  }
};
