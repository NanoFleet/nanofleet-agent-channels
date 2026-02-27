import axios, { type AxiosInstance } from "axios";
import { EventSource } from "eventsource";
import type { AgentRequest, AgentResponse } from "../types/index.js";

export interface AgentNotification {
  text: string;
  timestamp: string;
  source: string;
}

export class AgentClient {
  private client: AxiosInstance;
  private agentId: string;

  constructor(baseUrl: string, agentId: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 120000,
    });
    this.agentId = agentId;
  }

  async waitForAgent(maxRetries = 30, intervalMs = 2000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.get("/health");
        return true;
      } catch {
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
    }
    return false;
  }

  async generate(
    content: string,
    options?: {
      threadId?: string;
      resourceId?: string;
    },
  ): Promise<AgentResponse> {
    const request: AgentRequest = {
      messages: [{ role: "user", content }],
      ...options,
    };

    const response = await this.client.post<AgentResponse>(
      `/api/agents/${this.agentId}/generate`,
      request,
    );

    return response.data;
  }

  async createThread(resourceId: string): Promise<string> {
    const response = await this.client.post<{ thread: { id: string } }>(
      `/api/agents/${this.agentId}/memory/threads`,
      { resourceId },
    );
    return response.data.thread.id;
  }

  subscribeNotifications(
    onNotification: (n: AgentNotification) => void,
    onError?: (err: unknown) => void,
  ): () => void {
    const url = `${this.client.defaults.baseURL}/api/agents/${this.agentId}/notifications/stream`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const notification: AgentNotification = JSON.parse(event.data);
        onNotification(notification);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = (err) => {
      onError?.(err);
    };

    return () => es.close();
  }

  async *stream(
    content: string,
    options?: {
      threadId?: string;
      resourceId?: string;
    },
  ): AsyncGenerator<string, void, unknown> {
    const request: AgentRequest = {
      messages: [{ role: "user", content }],
      ...options,
    };

    const response = await this.client.post(
      `/api/agents/${this.agentId}/stream`,
      request,
      {
        responseType: "stream",
      },
    );

    for await (const chunk of response.data) {
      const text = chunk.toString();
      if (text.startsWith("data: ")) {
        const data = text.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) yield parsed.text;
        } catch {
          yield data;
        }
      }
    }
  }
}
