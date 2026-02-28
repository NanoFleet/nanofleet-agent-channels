# NanoFleet Agent Channels

> Communication channel adapters for connecting external platforms to [NanoFleet Agent](https://github.com/NanoFleet/nanofleet-agent).

## Overview

Each channel adapter bridges an external platform and a `nanofleet-agent` instance. It normalizes incoming messages and forwards them to the agent via HTTP/SSE — the agent has no knowledge of which channel is calling it.

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
3. Calls `POST /api/agents/main/stream`
4. Sends the streamed response back to the platform

> **Using NanoFleet?** Channels are deployed and managed from the web dashboard — no manual configuration needed. This repo is for standalone use with `nanofleet-agent`.

## Available Channels

| Channel | Status | Image |
|---------|--------|-------|
| [telegram](./telegram/) | ✅ Ready | `ghcr.io/nanofleet/nanofleet-channel-telegram:latest` |
| discord | 🔜 Planned | — |
| webhook | 🔜 Planned | — |

## Usage

See each channel's README for configuration details:

- [telegram/README.md](./telegram/README.md)

For Docker deployment alongside `nanofleet-agent`, see the commented channel section in [nanofleet-agent/docker-compose.yml](https://github.com/NanoFleet/nanofleet-agent/blob/main/docker-compose.yml).

## Common Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_URL` | URL of the nanofleet-agent instance | `http://agent:4111` |
| `AGENT_ID` | Agent ID to send messages to | `main` |

## Adding a New Channel

1. Create a new directory: `mkdir discord && cd discord`
2. Initialize with `bun init`
3. Implement the channel interface:

```typescript
interface Channel {
  start(): Promise<void>
  stop(): Promise<void>
}
```

4. Add a `Dockerfile`, `.env.example`, and `README.md`
5. Update this README with the new channel
