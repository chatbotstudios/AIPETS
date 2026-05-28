import { sseBroker } from "@/lib/sse-broker";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let modelName = "unknown-model";
  try {
    const body = await req.json();
    modelName = body.model || "gpt-4o-mini";
    const messages = body.messages || [];
    const prompt = messages[messages.length - 1]?.content || "Hello";
    const tools = body.tools || [];
    const hasTools = Array.isArray(tools) && tools.length > 0;

    console.log(`[Proxy] Intercepted completions request for: ${modelName}`);

    // 1. Broadcast initial pulse to sseBroker
    if (hasTools) {
      const toolNames = tools.map((t: any) => t?.function?.name || 'tool').join(', ');
      sseBroker.broadcast("tool_calls", {
        model: modelName,
        text: `Executing tools: ${toolNames}`,
        tools: toolNames,
        source: req.headers.get('x-aipet-source') || 'proxy'
      });
    } else {
      sseBroker.broadcast("thinking", {
        model: modelName,
        text: prompt.length > 60 ? prompt.substring(0, 57) + "..." : prompt,
        source: req.headers.get('x-aipet-source') || 'proxy'
      });
    }

    // 2. Locate API Keys (from process.env or system fallback)
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const xaiKey = process.env.XAI_API_KEY || process.env.XAI_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    let responseText = "";
    let tokenEstimate = 0;
    let isMocked = false;

    // Helper: Generate Mock fallback if key is missing or call fails
    const executeMockResponse = (reason: string = "No API keys configured in environment.") => {
      isMocked = true;
      responseText = `[CYBERSPACE TELEMETRY MATCHED]\nThis is a high-fidelity simulated response for model: ${modelName}.\nTelemetry Proxy recovered from [${reason}] and executed a simulated completions handshake successfully!`;
      tokenEstimate = Math.ceil(prompt.length / 4) + 120;
    };

    // 3. Resolve routing with complete try-catch resilience
    const isGemini = modelName.includes("gemini") || modelName.includes("google");
    const isOpenai = modelName.includes("gpt") || modelName.includes("openai");
    const isClaude = modelName.includes("claude") || modelName.includes("anthropic");
    const isXai = modelName.includes("grok") || modelName.includes("xai");
    const isDeepseek = modelName.includes("deepseek");

    try {
      if (isGemini) {
        if (geminiKey) {
          // Look for system message in forwarded messages
          const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
          
          const payload: any = {
            contents: [{ parts: [{ text: prompt }] }]
          };
          if (systemMsg) {
            payload.systemInstruction = {
              parts: [{ text: systemMsg }]
            };
          }

          // Attempt using v1 endpoint first for better stability
          const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${geminiKey}`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            const resData = await response.json();
            responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "No content.";
            tokenEstimate = Math.ceil((prompt.length + responseText.length + systemMsg.length) / 4);
          } else {
            const errText = await response.text();
            throw new Error(`GCP Gemini API ${response.status}: ${errText}`);
          }
        } else {
          executeMockResponse();
        }
      }
      else if (isOpenai) {
        if (openaiKey) {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openaiKey}`
            },
            body: JSON.stringify({ model: modelName, messages })
          });
          if (response.ok) {
            const resData = await response.json();
            responseText = resData.choices?.[0]?.message?.content || "No content.";
            tokenEstimate = resData.usage?.total_tokens || Math.ceil((prompt.length + responseText.length) / 4);
          } else {
            const errText = await response.text();
            throw new Error(`OpenAI API ${response.status}: ${errText}`);
          }
        } else {
          executeMockResponse();
        }
      }
      else if (isClaude) {
        if (anthropicKey) {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json"
            },
            body: JSON.stringify({
              model: modelName,
              max_tokens: 1024,
              messages: [{ role: "user", content: prompt }]
            })
          });
          if (response.ok) {
            const resData = await response.json();
            responseText = resData.content?.[0]?.text || "No content.";
            tokenEstimate = (resData.usage?.input_tokens ?? 0) + (resData.usage?.output_tokens ?? 0);
          } else {
            const errText = await response.text();
            throw new Error(`Anthropic API ${response.status}: ${errText}`);
          }
        } else {
          executeMockResponse();
        }
      }
      else if (isXai) {
        if (xaiKey) {
          const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${xaiKey}`
            },
            body: JSON.stringify({ model: "grok-beta", messages })
          });
          if (response.ok) {
            const resData = await response.json();
            responseText = resData.choices?.[0]?.message?.content || "No content.";
            tokenEstimate = resData.usage?.total_tokens || Math.ceil((prompt.length + responseText.length) / 4);
          } else {
            const errText = await response.text();
            throw new Error(`xAI API ${response.status}: ${errText}`);
          }
        } else {
          executeMockResponse();
        }
      }
      else if (isDeepseek) {
        if (deepseekKey) {
          const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${deepseekKey}`
            },
            body: JSON.stringify({ model: "deepseek-chat", messages })
          });
          if (response.ok) {
            const resData = await response.json();
            responseText = resData.choices?.[0]?.message?.content || "No content.";
            tokenEstimate = resData.usage?.total_tokens || Math.ceil((prompt.length + responseText.length) / 4);
          } else {
            const errText = await response.text();
            throw new Error(`DeepSeek API ${response.status}: ${errText}`);
          }
        } else {
          executeMockResponse();
        }
      }
      else {
        executeMockResponse("Unrecognized model architecture profile");
      }
    } catch (apiErr: any) {
      console.warn(`[Proxy Fallback] Live API call failed: ${apiErr.message}. Executing simulated response...`);
      executeMockResponse(`Live API failure - ${apiErr.message.substring(0, 80)}`);
    }

    // 4. Broadcast "success" state to browser client
    sseBroker.broadcast("success", {
      model: modelName,
      text: responseText,
      tokens: tokenEstimate,
      action: hasTools ? 'tool_call' : 'chat_complete',
      source: req.headers.get('x-aipet-source') || "cyberspace"
    });

    // 5. Construct OpenAI compatible success JSON response
    return Response.json({
      id: `chatcmpl-claw-${Math.floor(Math.random() * 0xfffffff).toString(16)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: responseText
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: Math.ceil(prompt.length / 4),
        completion_tokens: tokenEstimate - Math.ceil(prompt.length / 4),
        total_tokens: tokenEstimate
      }
    });

  } catch (error: any) {
    console.error("[Proxy Fatal Exception]:", error);
    
    // Broadcast "error" state pulse
    sseBroker.broadcast("error", {
      model: modelName,
      text: error.message || "Cyberspace connection aborted."
    });

    return Response.json(
      { error: { message: error.message || "Proxy completed with internal errors." } },
      { status: 500 }
    );
  }
}
