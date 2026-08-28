# Economy Bot

A modern Discord economy bot starter built with Node.js and discord.js v14.

## Core design

- **Bot Owners/Admins are configured only through `.env`**.
- Discord server ownership, Administrator permissions, and moderator roles do **not** grant bot-level permissions.
- Bot admins can disable/enable bot commands in selected channels.
- Economy data is stored in a local JSON file for this starter implementation.

## Setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and optionally `DISCORD_GUILD_ID`.
5. Add comma-separated Discord user IDs to `BOT_OWNER_IDS` and `BOT_ADMIN_IDS`.
6. Run `npm start`.

## Current commands

### User economy

- `/balance [user]`
- `/daily`
- `/pay user amount`
- `/deposit amount`
- `/withdraw amount`
- `/leaderboard`

### Channel controls

- `/disable channel` — bot admin only
- `/enable channel` — bot admin only
- `/disabled`

### Economy administration

- `/economy give user amount` — bot admin
- `/economy remove user amount` — bot admin
- `/economy set user amount` — bot admin
- `/economy reset user` — bot owner only

## Next modules

The project is intentionally being built in modules so the economy can be expanded cleanly with jobs, shop/items, inventory, achievements, businesses, profiles, cooldowns, statistics, and richer embeds/UI.
