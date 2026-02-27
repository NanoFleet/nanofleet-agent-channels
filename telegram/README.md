# NanoFleet Agent Channels — Telegram

> Channel adapter for connecting Telegram bots to NanoFleet Agent.

## Overview

This package provides a Telegram channel adapter that connects Telegram bots to the NanoFleet Agent runtime. It handles message normalization, user authentication (optional whitelist), and response streaming.

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.x or later)
- A running instance of [nanofleet-agent](https://github.com/NanoFleet/nanofleet-agent)
- A Telegram Bot Token (obtain via [@BotFather](https://t.me/BotFather))

## Installation

```bash
# Clone or navigate to the channels repository
cd nanofleet-agent-channels/telegram

# Install dependencies
bun install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Bot token from @BotFather |
| `AGENT_URL` | No | `http://agent:4111` | URL of the nanofleet-agent instance |
| `AGENT_ID` | No | `main` | Agent ID to send messages to |
| `ALLOWED_USERS` | No | (empty) | Comma-separated list of allowed Telegram user IDs |
| `NOTIFICATION_USER_ID` | No | (empty) | Telegram user ID to receive agent notifications (heartbeat, cron) |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |

### User Whitelist

To restrict access to specific users, set `ALLOWED_USERS` with comma-separated Telegram user IDs:

```
ALLOWED_USERS=123456789,987654321
```

If left empty, all Telegram users can interact with the bot.

### Notifications

Set `NOTIFICATION_USER_ID` to receive proactive messages from the agent (heartbeat results, scheduled tasks). Use `/whoami` to find your Telegram user ID.

```
NOTIFICATION_USER_ID=123456789
```

If left empty, notifications are disabled — the agent will still run scheduled tasks but won't forward results to Telegram.

## Usage

### Development

```bash
bun run dev
```

### Production

```bash
bun run start
```

### Build

```bash
bun run build
```

The built output will be in the `dist/` directory.

## Docker

### Build

```bash
docker build -t nanofleet-agent-telegram .
```

### Run

```bash
docker run -d \
  --name nanofleet-telegram \
  -e TELEGRAM_BOT_TOKEN=your_bot_token \
  -e AGENT_URL=http://agent:4111 \
  -e ALLOWED_USERS=123456789 \
  nanofleet-agent-telegram
```

### Docker Compose

```yaml
services:
  telegram:
    build: ./telegram
    env_file:
      - ./telegram/.env
    depends_on:
      - agent
    restart: unless-stopped

  agent:
    image: nanofleet-agent
    volumes:
      - ./workspace:/workspace
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AGENT_MODEL=claude-sonnet-4-6
    ports:
      - "4111:4111"
    restart: unless-stopped
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and show welcome message |
| `/help` | Show available commands |
| `/new` | Start a new conversation (clears thread history) |
| `/whoami` | Display your Telegram user ID |

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Telegram   │────▶│  Telegram Channel    │────▶│ NanoFleet Agent │
│   User      │◀────│  (this adapter)      │◀────│   (HTTP/SSE)    │
└─────────────┘     └──────────────────────┘     └─────────────────┘
                              ▲
                              │  SSE /notifications/stream
                              └──────────────────────────
```

1. **Telegram → Channel**: User sends a message via Telegram
2. **Channel → Agent**: Message is normalized and sent to `/api/agents/:id/generate`
3. **Agent → Channel**: Agent processes the message and returns a response
4. **Channel → Telegram**: Response is sent back to the user
5. **Agent → Channel (proactive)**: The channel subscribes to `GET /api/agents/:id/notifications/stream` at startup. When the agent emits a notification (heartbeat result, scheduled task), it is forwarded to the configured `NOTIFICATION_USER_ID`.

## Thread Management

Each user gets a dedicated conversation thread (`threadId: telegram:<user_id>`). The thread ID is derived deterministically from the Telegram user ID and persists across channel restarts. Use `/new` to start a fresh conversation — the new thread ID is saved to `threads.json` and survives restarts.

## Response Format

After each response, the bot displays token usage:

```
[tokens: 342 in + 128 out | $0.0008 | model: claude-sonnet-4-6]
```
