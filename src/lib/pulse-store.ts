/**
 * Global in-memory pulse store for Vercel serverless environments.
 *
 * On Vercel, each API route handler runs in its own serverless function
 * invocation with isolated memory. The SSE broker pattern (subscribe/broadcast)
 * only works within the SAME invocation — it cannot relay data across different
 * serverless functions (e.g., /api/pulse POST → /api/sse GET).
 *
 * This module provides a simple global store for the latest pulse that the
 * browser can poll via GET /api/pulse. Because Vercel reuses warm function
 * instances, the global variable persists across consecutive requests to
 * the SAME route, enabling reliable short-polling.
 */

interface PulsePayload {
  status: string;
  model: string;
  text: string;
  tokens?: number;
  tools?: string;
  source?: string;
  timestamp: number;
}

interface GlobalWithPulseStore {
  _latestPulse?: PulsePayload | null;
}

const g = global as unknown as GlobalWithPulseStore;

export const pulseStore = {
  /**
   * Store a new pulse payload with the current timestamp.
   */
  set(pulse: Omit<PulsePayload, 'timestamp'>) {
    g._latestPulse = {
      ...pulse,
      timestamp: Date.now()
    };
  },

  /**
   * Retrieve the latest stored pulse, or null if none exists.
   */
  get(): PulsePayload | null {
    return g._latestPulse || null;
  },

  /**
   * Clear the stored pulse (optional, for cleanup).
   */
  clear() {
    g._latestPulse = null;
  }
};
