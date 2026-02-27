import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { type Context, Telegraf } from "telegraf";
import type { AgentClient } from "../agent/client.js";

export interface TelegramChannelConfig {
  botToken: string;
  allowedUsers: number[];
  agentClient: AgentClient;
  logLevel: string;
  threadsFilePath?: string;
  notificationUserId?: number;
}

function parseLogLevel(level: string): number {
  switch (level.toLowerCase()) {
    case "debug":
      return 0;
    case "info":
      return 1;
    case "warn":
      return 2;
    case "error":
      return 3;
    default:
      return 1;
  }
}

function log(level: string, message: string, ...args: unknown[]): void {
  const levels = ["debug", "info", "warn", "error"];
  const currentLevel = parseLogLevel(process.env.LOG_LEVEL || "info");
  const messageLevel = levels.indexOf(level);

  if (messageLevel >= currentLevel) {
    console.log(`[${level.toUpperCase()}]`, message, ...args);
  }
}

function extractTextContent(ctx: Context): string | null {
  if (ctx.message && "text" in ctx.message) {
    return ctx.message.text;
  }
  if (ctx.editedMessage && "text" in ctx.editedMessage) {
    return ctx.editedMessage.text;
  }
  return null;
}

function getUserId(ctx: Context): number | null {
  return ctx.from?.id ?? null;
}

function getChatId(ctx: Context): number | null {
  return ctx.chat?.id ?? null;
}

export class TelegramChannel {
  private bot: Telegraf;
  private config: TelegramChannelConfig;
  private threadsFilePath: string;
  // Only stores overrides from /new — normal threadId is derived deterministically
  private threadOverrides: Record<string, string> = {};
  private unsubscribeNotifications?: () => void;

  constructor(config: TelegramChannelConfig) {
    this.bot = new Telegraf(config.botToken);
    this.config = config;
    this.threadsFilePath = config.threadsFilePath ?? "threads.json";
    this.loadThreadOverrides();
  }

  private loadThreadOverrides(): void {
    if (existsSync(this.threadsFilePath)) {
      try {
        this.threadOverrides = JSON.parse(
          readFileSync(this.threadsFilePath, "utf-8"),
        );
        log(
          "debug",
          `Loaded ${Object.keys(this.threadOverrides).length} thread override(s) from disk`,
        );
      } catch {
        log("warn", "Failed to parse threads.json, starting fresh");
        this.threadOverrides = {};
      }
    }
  }

  private saveThreadOverrides(): void {
    writeFileSync(
      this.threadsFilePath,
      JSON.stringify(this.threadOverrides, null, 2),
    );
  }

  private getThreadId(userId: number): string {
    return this.threadOverrides[userId] ?? `telegram:${userId}`;
  }

  async start(): Promise<void> {
    log("info", "Starting Telegram channel...");

    this.bot.use(this.authMiddleware.bind(this));
    this.bot.on("text", this.handleMessage.bind(this));

    if (this.config.notificationUserId) {
      this.unsubscribeNotifications =
        this.config.agentClient.subscribeNotifications(
          (notification) => {
            log(
              "info",
              `Notification received from agent: ${notification.text.substring(0, 60)}...`,
            );
            this.bot.telegram
              .sendMessage(this.config.notificationUserId, notification.text)
              .catch((err) =>
                log("error", "Failed to send notification:", err),
              );
          },
          (err) =>
            log(
              "warn",
              "Notification stream error (will reconnect automatically):",
              err,
            ),
        );
      log(
        "info",
        `Notifications enabled — will forward to user ${this.config.notificationUserId}`,
      );
    } else {
      log("info", "NOTIFICATION_USER_ID not set — notifications disabled");
    }

    await this.bot.launch();
    log("info", "Telegram bot started and polling...");
  }

  async stop(): Promise<void> {
    this.unsubscribeNotifications?.();
    this.bot.stop("SIGINT");
    log("info", "Telegram bot stopped");
  }

  private isUserAllowed(userId: number): boolean {
    if (this.config.allowedUsers.length === 0) {
      return true;
    }
    return this.config.allowedUsers.includes(userId);
  }

  private async authMiddleware(
    ctx: Context,
    next: () => Promise<void>,
  ): Promise<void> {
    const userId = getUserId(ctx);

    if (!userId) {
      log("warn", "Message from unknown user (no user ID)");
      return;
    }

    if (!this.isUserAllowed(userId)) {
      log("warn", `Unauthorized user ${userId} tried to access the bot`);
      await ctx.reply(
        "⛔ Access denied. You are not authorized to use this bot.",
      );
      return;
    }

    await next();
  }

  private async handleMessage(ctx: Context): Promise<void> {
    const text = extractTextContent(ctx);
    const userId = getUserId(ctx);
    const chatId = getChatId(ctx);

    if (!text || !userId || !chatId) {
      return;
    }

    if (text.startsWith("/")) {
      await this.handleCommand(ctx, text);
      return;
    }

    log("info", `Message from user ${userId}: ${text.substring(0, 50)}...`);

    const threadId = this.getThreadId(userId);

    try {
      await ctx.sendChatAction("typing");

      const response = await this.config.agentClient.generate(text, {
        threadId,
        resourceId: `telegram:${userId}`,
      });

      await ctx.reply(response.text, {
        parse_mode: "Markdown",
      });

      if (response.usage) {
        const usageText = `[tokens: ${response.usage.inputTokens} in + ${response.usage.outputTokens} out`;
        if (response.cost !== undefined) {
          await ctx.reply(`${usageText} | $${response.cost.toFixed(4)}]`);
        } else {
          await ctx.reply(`${usageText}]`);
        }
      }

      log("info", `Response sent to user ${userId}`);
    } catch (error) {
      log("error", "Error processing message:", error);
      await ctx.reply("Sorry, I encountered an error processing your message.");
    }
  }

  private async handleCommand(ctx: Context, text: string): Promise<void> {
    const userId = getUserId(ctx);

    if (!userId) return;

    switch (text) {
      case "/start":
        await ctx.reply(
          "👋 Welcome to NanoFleet Agent!\n\nSend me a message and I'll forward it to the AI agent.",
        );
        break;

      case "/help":
        await ctx.reply(
          "📖 *Commands:*\n\n" +
            "/start - Start the bot\n" +
            "/help - Show this help\n" +
            "/new - Start a new conversation\n" +
            "/whoami - Show your Telegram user ID",
        );
        break;

      case "/new": {
        try {
          const newThreadId = await this.config.agentClient.createThread(
            `telegram:${userId}`,
          );
          this.threadOverrides[userId] = newThreadId;
          this.saveThreadOverrides();
          await ctx.reply("🔄 New conversation started!");
        } catch {
          await ctx.reply(
            "Failed to start a new conversation. Please try again.",
          );
        }
        break;
      }

      case "/whoami":
        await ctx.reply(`Your Telegram ID: \`${userId}\``);
        break;

      default:
        await ctx.reply("Unknown command. Use /help for available commands.");
    }
  }
}
