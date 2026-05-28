import requests
from litellm.integrations.custom_logger import CustomLogger

class AIPETCallback(CustomLogger):
    def __init__(self, pulse_url="http://localhost:3000/api/pulse", source="hermes"):
        super().__init__()
        self.pulse_url = pulse_url
        self.source = source

    def log_success_event(self, kwargs, response_obj, start_time, end_time):
        """
        Triggered when a LiteLLM call succeeds.
        Forwards telemetry back to the AIPETS HUD.
        """
        try:
            messages = kwargs.get("messages", [])
            last_msg = messages[-1].get("content", "") if messages else ""
            thought = last_msg[:150] if last_msg else "LLM call completed successfully."

            tools = kwargs.get("tools", [])
            action = "tool_call" if tools else "chat_complete"
            
            # response_obj is usually a ModelResponse object
            usage = getattr(response_obj, "usage", None)
            tokens = usage.total_tokens if usage and hasattr(usage, "total_tokens") else 120

            telemetry = {
                "status": "success",
                "model": kwargs.get("model", "unknown-model"),
                "text": thought,
                "action": action,
                "tokens": tokens,
                "source": self.source,
                "tools": [t.get("function", {}).get("name", "tool") for t in tools] if tools else []
            }

            requests.post(self.pulse_url, json=telemetry, timeout=3)
        except Exception as e:
            # We fail silently here because telemetry is non-critical for the agent
            print(f"[AIPETS Telemetry] Failed to broadcast success pulse: {e}")

    def log_pre_api_call(self, model, messages, kwargs):
        """
        Triggered right before LiteLLM sends the request to the provider.
        """
        try:
            tools = kwargs.get("tools", [])
            status = "tool_calls" if tools else "thinking"
            
            last_msg = messages[-1].get("content", "") if messages else ""
            thought = last_msg[:120] if last_msg else "Analyzing prompt..."

            telemetry = {
                "status": status,
                "model": model,
                "text": thought,
                "source": self.source,
                "tools": [t.get("function", {}).get("name", "tool") for t in tools] if tools else []
            }

            requests.post(self.pulse_url, json=telemetry, timeout=3)
        except Exception as e:
            print(f"[AIPETS Telemetry] Failed to broadcast pre-api pulse: {e}")

# Example usage (if run directly):
if __name__ == "__main__":
    import litellm
    
    # Register the custom callback
    litellm.callbacks = [AIPETCallback(pulse_url="http://localhost:3000/api/pulse")]
    
    print("AIPET Callback registered. Run your LiteLLM completions as normal!")
