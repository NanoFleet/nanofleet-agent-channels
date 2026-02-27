export interface ChannelConfig {
  TELEGRAM_BOT_TOKEN: string;
  ALLOWED_USERS: string;
  AGENT_URL: string;
  AGENT_ID: string;
  LOG_LEVEL: string;
}

export interface AgentRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  threadId?: string;
  resourceId?: string;
}

export interface AgentResponse {
  text: string;
  threadId: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  cost?: number;
}
