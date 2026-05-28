import { pulseStore } from "@/lib/pulse-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "";
    const prompt = body.prompt || "";

    const tgToken = body.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
    const tgGroup = body.telegramChatId || process.env.ALLOWED_GROUPS?.split(',')[0] || "0";
    
    const discordToken = body.discordBotToken || process.env.DISCORD_BOT_TOKEN;
    const discordChannel = body.discordChannelId || process.env.DISCORD_CHANNEL_ID;
    
    const githubPat = body.agentGithubPat || process.env.AGENT_GITHUB_PAT;
    const braveSearchApi = process.env.BRAVE_SEARCH_API;

    console.log(`[Platform API] Trigger action: ${action} with dynamic config overrides`);

    if (action === "telegram") {
      if (!tgToken) throw new Error("TELEGRAM_BOT_TOKEN not configured in .env");
      
      // 1. Broadcast Connecting pulse
      pulseStore.set({
        status: "connecting",
        model: "Telegram Bot",
        text: "Initiating telegram uplink ping..."
      });

      // 2. Post to Telegram API
      const response = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: parseInt(tgGroup),
          text: `🔔 [AIPETS Telemetry Uplink Ping]\nCompanion Designation: GhostScout\nConnection Status: NOMINAL ✅\nCyberspace routing link established.`
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Telegram API returned: ${errText}`);
      }

      // 3. Broadcast Success pulse
      pulseStore.set({
        status: "success",
        model: "Telegram Bot",
        text: "Telemetry ping dispatched successfully to Telegram!",
        tokens: 45
      });

      return Response.json({ success: true, message: "Telegram ping completed." });
    }

    else if (action === "discord") {
      if (!discordToken || !discordChannel) {
        throw new Error("DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID not configured in .env");
      }

      // 1. Broadcast Connecting pulse
      pulseStore.set({
        status: "connecting",
        model: "Discord Bot",
        text: "Initiating discord uplink ping..."
      });

      // 2. Post to Discord API
      const response = await fetch(`https://discord.com/api/v10/channels/${discordChannel}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${discordToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: `🎮 **[AIPETS Telemetry Uplink Ping]**\nCompanion: \`GhostScout\`\nConnection Status: \`ACTIVE (100% ONLINE)\`\nReady to capture ambient signal index beacon loops!`
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Discord API returned: ${errText}`);
      }

      // 3. Broadcast Success pulse
      pulseStore.set({
        status: "success",
        model: "Discord Bot",
        text: "Telemetry ping posted successfully to Discord channel!",
        tokens: 65
      });

      return Response.json({ success: true, message: "Discord ping completed." });
    }

    else if (action === "github") {
      if (!githubPat) throw new Error("AGENT_GITHUB_PAT not configured in .env");

      // 1. Broadcast Tool Call pulse
      pulseStore.set({
        status: "tool_calls",
        model: "GitHub Uplink",
        tools: "github_pull_commits, check_version_history",
        text: "Querying GitHub API..."
      });

      // 2. Fetch recent commits from GitHub repo
      const response = await fetch("https://api.github.com/repos/chatbotstudios/AIPETS/commits?per_page=3", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${githubPat}`,
          "User-Agent": "AIPETS-Dashboard"
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GitHub API returned: ${errText}`);
      }

      const commits = await response.json();
      const latestMsg = commits[0]?.commit?.message || "No commits found";
      const author = commits[0]?.commit?.author?.name || "Unknown";

      // 3. Broadcast Success pulse
      pulseStore.set({
        status: "success",
        model: "GitHub Uplink",
        text: `Repository active! Latest Commit: "${latestMsg}" by ${author}`,
        tokens: 150
      });

      return Response.json({ success: true, commit: latestMsg });
    }

    else if (action === "brave_search") {
      if (!braveSearchApi) throw new Error("BRAVE_SEARCH_API not configured in .env");
      if (!prompt) throw new Error("Brave search requires a search query prompt.");

      // 1. Broadcast Tool Call pulse
      pulseStore.set({
        status: "tool_calls",
        model: "Brave Search API",
        tools: "brave_web_search",
        text: `Querying brave search for: ${prompt}`
      });

      // 2. Query Brave Search API
      const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(prompt)}`;
      const response = await fetch(searchUrl, {
        method: "GET",
        headers: {
          "X-Subscription-Token": braveSearchApi,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Brave Search API returned: ${errText}`);
      }

      const resData = await response.json();
      const results = resData.web?.results || [];
      const snippets = results
        .slice(0, 3)
        .map((r: any) => `* ${r.title}: ${r.description} (${r.url})`)
        .join("\n\n");

      // 3. Broadcast Success pulse with snippets summary
      pulseStore.set({
        status: "success",
        model: "Brave Search API",
        text: snippets || "No results matched the search query.",
        tokens: 380
      });

      return Response.json({ success: true, snippets });
    }

    else {
      throw new Error(`Unrecognized action: ${action}`);
    }

  } catch (error: any) {
    console.error("[Platform API Exception]:", error);
    
    // Broadcast Error pulse
    pulseStore.set({
      status: "error",
      model: "Cyberspace Uplink Gateway",
      text: error.message || "Failed executing uplink action."
    });

    return Response.json(
      { error: { message: error.message || "Uplink gateway error." } },
      { status: 500 }
    );
  }
}
