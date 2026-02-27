# NanoFleet Agent Channels

> Communication channel adapters for connecting external platforms to NanoFleet Agent.

## Overview

This repository contains channel adapters that connect various communication platforms to [NanoFleet Agent](https://github.com/NanoFleet/nanofleet-agent). Each channel normalizes incoming messages and forwards them to the agent via HTTP/SSE.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Platform   │────▶│  Channel Adapter │────▶│ NanoFleet Agent │
│ (Telegram,  │◀────│  (this repo)     │◀────│   (HTTP/SSE)    │
│  Discord,   │     │                  │     │                 │
│  Webhook)   │     │                  │     │                 │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

Each channel:
1. Receives messages from a platform (Telegram update, Discord event, HTTP webhook...)
2. Normalizes them into the agent's message format
3. Calls `POST /api/agents/:id/stream` (or `/generate`)
4. Sends the streamed response back to the platform

The agent has no knowledge of which channel is calling it.

## Available Channels

| Channel | Status | Description |
|---------|--------|-------------|
| [telegram](./telegram/) | ✅ Ready | Telegram bot adapter |
| discord | 🔜 Planned | Discord bot adapter |
| webhook | 🔜 Planned | Generic HTTP webhook adapter |

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.x or later)
- A running instance of [nanofleet-agent](https://github.com/NanoFleet/nanofleet-agent)

## Quick Start

### Telegram

```bash
cd telegram
cp .env.example .env
# Edit .env with your TELEGRAM_BOT_TOKEN
bun install
bun run dev
```

See [telegram/README.md](./telegram/README.md) for detailed instructions.

## Development

Each channel is a standalone Bun project with its own dependencies and configuration.

```
nanofleet-agent-channels/
├── telegram/
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── agent/            # AgentClient for HTTP communication
│   │   ├── telegram/         # Telegram bot implementation
│   │   └── types/            # Shared TypeScript types
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
├── .gitignore
└── README.md
```

## Adding a New Channel

To add a new channel (e.g., Discord):

1. Create a new directory: `mkdir discord && cd discord`
2. Initialize with `bun init`
3. Implement the channel interface:

```typescript
interface Channel {
  start(): Promise<void>
  stop(): Promise<void>
}
```

4. Add configuration to `.env.example`
5. Update this README with the new channel status

## Configuration

Channels are configured via environment variables. See each channel's README for specific variables.

### Common Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_URL` | URL of the nanofleet-agent instance | `http://agent:4111` |
| `AGENT_ID` | Agent ID to send messages to | `main` |
| `LOG_LEVEL` | Log level: `debug`, `info`, `warn`, `error` | `info` |
