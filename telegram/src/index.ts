import "dotenv/config";
import { AgentClient } from "./agent/client.js";
import { TelegramChannel } from "./telegram/bot.js";

interface Config {
  TELEGRAM_BOT_TOKEN: string;
  ALLOWED_USERS: string;
  AGENT_URL: string;
  AGENT_ID: string;
  LOG_LEVEL: string;
  allowedUsers: number[];
  notificationUserId?: number;
}

function loadConfig(): Config {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ALLOWED_USERS = process.env.ALLOWED_USERS || "";
  const AGENT_URL = process.env.AGENT_URL || "http://agent:4111";
  const AGENT_ID = process.env.AGENT_ID || "main";
  const LOG_LEVEL = process.env.LOG_LEVEL || "info";
  const NOTIFICATION_USER_ID = process.env.NOTIFICATION_USER_ID
    ? Number.parseInt(process.env.NOTIFICATION_USER_ID, 10)
    : undefined;

  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[ERROR] TELEGRAM_BOT_TOKEN is required");
    process.exit(1);
  }

  const allowedUsers: number[] = ALLOWED_USERS.split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => {
      const num = Number.parseInt(s, 10);
      if (Number.isNaN(num)) {
        console.warn(`[WARN] Invalid user ID: ${s}, skipping`);
        return null;
      }
      return num;
    })
    .filter((n): n is number => n !== null);

  if (allowedUsers.length > 0) {
    console.log(
      `[INFO] Whitelist enabled: ${allowedUsers.length} user(s) allowed`,
    );
  } else {
    console.log("[INFO] No whitelist - all users allowed");
  }

  return {
    TELEGRAM_BOT_TOKEN,
    ALLOWED_USERS,
    AGENT_URL,
    AGENT_ID,
    LOG_LEVEL,
    allowedUsers,
    notificationUserId: Number.isNaN(NOTIFICATION_USER_ID)
      ? undefined
      : NOTIFICATION_USER_ID,
  };
}

async function main(): Promise<void> {
  console.log("=".repeat(50));
  console.log("NanoFleet Agent Channels");
  console.log("=".repeat(50));

  const config = loadConfig();

  console.log(`[INFO] Agent URL: ${config.AGENT_URL}`);
  console.log(`[INFO] Agent ID: ${config.AGENT_ID}`);

  const agentClient = new AgentClient(config.AGENT_URL, config.AGENT_ID);

  console.log("[INFO] Waiting for agent to be ready...");
  const agentReady = await agentClient.waitForAgent();
  if (!agentReady) {
    console.error("[ERROR] Agent is not available");
    process.exit(1);
  }
  console.log("[INFO] Agent is ready!");

  const telegramChannel = new TelegramChannel({
    botToken: config.TELEGRAM_BOT_TOKEN,
    allowedUsers: config.allowedUsers,
    agentClient,
    logLevel: config.LOG_LEVEL,
    notificationUserId: config.notificationUserId,
  });

  process.on("SIGINT", async () => {
    console.log("\n[INFO] Shutting down...");
    await telegramChannel.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[INFO] Shutting down...");
    await telegramChannel.stop();
    process.exit(0);
  });

  await telegramChannel.start();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
    console.error("[FATAL] Invalid Telegram bot token. Check your TELEGRAM_BOT_TOKEN.");
  } else {
    console.error("[FATAL] Failed to start:", error);
  }
  process.exit(1);
});
