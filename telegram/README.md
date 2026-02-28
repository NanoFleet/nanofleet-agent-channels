# Telegram Channel

> Telegram bot adapter for [NanoFleet Agent](https://github.com/NanoFleet/nanofleet-agent).

## Prerequisites

- A running instance of [nanofleet-agent](https://github.com/NanoFleet/nanofleet-agent)
- A Telegram Bot Token (obtain via [@BotFather](https://t.me/BotFather))

## Configuration

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Bot token from @BotFather |
| `AGENT_URL` | No | `http://agent:4111` | URL of the nanofleet-agent instance |
| `AGENT_ID` | No | `main` | Agent ID to send messages to |
| `ALLOWED_USERS` | No | (empty) | Comma-separated Telegram user IDs — if empty, all users are allowed |
| `NOTIFICATION_USER_ID` | No | (empty) | Telegram user ID to receive agent notifications (heartbeat, cron) |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |

### User Whitelist

```
ALLOWED_USERS=123456789,987654321
```

### Notifications

Set `NOTIFICATION_USER_ID` to receive proactive messages from the agent. Use `/whoami` to find your Telegram user ID.

```
NOTIFICATION_USER_ID=123456789
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and show welcome message |
| `/help` | Show available commands |
| `/new` | Start a new conversation (clears thread history) |
| `/whoami` | Display your Telegram user ID |

## Thread Management

Each user gets a dedicated conversation thread (`threadId: telegram:<user_id>`), derived deterministically from the Telegram user ID and persisted across restarts. Use `/new` to start a fresh conversation.

## Response Format

After each response, the bot displays token usage:

```
[tokens: 342 in + 128 out | $0.0008 | model: claude-haiku-4-5]
```

## Development

```bash
bun install
bun run dev
```
