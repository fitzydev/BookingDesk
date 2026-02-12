# BookingDesk
[![Dependency review](https://github.com/fitzydev/BookingDesk/actions/workflows/dependency-review.yml/badge.svg?branch=main&event=status)](https://github.com/fitzydev/BookingDesk/actions/workflows/dependency-review.yml)

A Discord bot that automatically scrapes public jail booking records and posts them to a configured channel on a customizable interval. Users can subscribe to specific counties and receive DM notifications when new bookings appear. This is just a fun project I threw together to help people stay informed about their community and to educate people on axios and cheerio usage!

⭐ Add a star to support me in my active development in this project, I will never accept donations for any of my projects I release in the future until further notice. 


## Features

- **Automatic scraping** — Periodically fetches new booking records and posts them as styled Discord embeds with colour-coded cards, icons, and batch summary headers
- **Configurable interval** — Admins set how often the bot checks for new records (5 min – 24 hours)
- **37 supported counties** across 15 US states
- **DM subscriptions** — Any user can subscribe to a county and get notified of new bookings via direct message
- **Deduplication** — Tracks seen records so the same booking is never posted twice
- **Autocomplete** — State and county selections use Discord's autocomplete for fast, typo-free input
- **Multi-county tracking** — A single server can track multiple counties simultaneously
- **Manual scrape** — Admins can trigger an immediate scrape on demand

## Supported States & Counties

| State | Counties |
|---|---|
| Alabama - Autauga, Cherokee, Escambia, Etowah, Franklin, Jefferson, Marshall,   Morgan, St Clair |
| Arizona - Greene, Yuma |
| Arkansas - Baxter, Columbia, Jefferson, Mississippi, Poinsett |
| California - Mendocino, Merced |
| Florida - Flagler |
| Illinois - Kendall, Macon |
| Indiana - Madison |
| Kansas - Bourbon, Geary, Leavenworth |
| Mississippi - Jones, Kemper |
| Missouri - Andrew, Benton, Buchanan, Callaway, Camden, Cape Girardeau, Johnson |
| New Mexico - San Juan |
| Ohio - Hancock, Muskingum |
| Texas - Bell, Kendall, Tom Green |
| Virginia - Chesapeake |
| Wisconsin - Kenosha |

## Project Structure

```
BookingDesk/
├── .env                        # Bot token & client ID (not committed)
├── index.js                    # Entry point — client, scheduler, interaction handler
├── deploy-commands.js          # One-time script to register slash commands
├── package.json
├── config/
│   ├── counties.js             # All supported counties with subdomain mappings
│   └── defaults.js             # Interval limits, batch sizes, user-agent
├── commands/
│   ├── setup.js                # /setup — set channel, add county, set interval
│   ├── interval.js             # /interval — change scrape frequency
│   ├── remove.js               # /remove — stop tracking a county
│   ├── scrape.js               # /scrape — trigger immediate scrape
│   ├── status.js               # /status — view current configuration
│   ├── subscribe.js            # /subscribe — opt in to DM alerts
│   ├── unsubscribe.js          # /unsubscribe — opt out of DM alerts
│   ├── mysubs.js               # /mysubs — list your subscriptions
│   └── counties.js             # /counties — browse supported counties
├── utils/
│   ├── scraper.js              # Axios + Cheerio HTML scraper
│   ├── store.js                # JSON-file persistence layer
│   └── embeds.js               # Discord embed builders (record cards, detail views, batch headers)
└── data/                       # Auto-created at runtime (JSON storage)
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Discord bot application — create one at the [Discord Developer Portal](https://discord.com/developers/applications)

### Required Bot Permissions

When generating your bot invite link, enable these permissions:

- **Send Messages**
- **Embed Links**
- **Use Application Commands**

### Required Intents

No privileged intents are needed. The bot only uses the default `Guilds` intent.

## Installation

```bash
git clone https://github.com/fitzydev/BookingDesk.git
cd BookingDesk
npm install
```

## Configuration

Copy the example values into `.env` and fill in your credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
GUILD_ID=                # Optional
```

## Usage

### 1. Register slash commands

Run this once (or whenever you add new commands):

```bash
npm run deploy
```

> If `GUILD_ID` is set, commands register instantly to that server. Otherwise they register globally and may take up to one hour to propagate.

### 2. Start the bot

```bash
npm start
```

### 3. Configure in Discord

Use `/setup` in your server to get started:

1. Pick a **channel** for record posts
2. Select a **state** and **county** to track
3. Optionally set an **interval** (defaults to 30 minutes)

Run `/setup` multiple times to add more counties.

## Slash Commands

### Admin Commands

These require the **Manage Server** permission.

| Command | Description |
|---|---|
| `/setup` | Set the post channel, add a county to track, and configure the scrape interval |
| `/interval` | Change the scrape interval (5–1440 minutes) |
| `/remove` | Stop tracking a specific county |
| `/scrape` | Trigger an immediate scrape and post results |
| `/status` | Display the current bot configuration for the server |

### User Commands

Available to all server members.

| Command | Description |
|---|---|
| `/subscribe` | Receive DM notifications when a county gets new bookings |
| `/unsubscribe` | Stop receiving DM notifications for a county |
| `/mysubs` | List all your active DM subscriptions |
| `/counties` | Browse all supported counties, optionally filtered by state |

## How It Works

1. **Scraping** — The bot fetches each tracked county's page at `https://{subdomain}.publicjailrecords.com/app/index.php` and parses booking cards using [Cheerio](https://cheerio.js.org/)
2. **Deduplication** — Each record ID is stored in `data/seen.json`; only new entries are posted
3. **Channel posts** — New records are sent as fully embed-based messages (no plain-text content). Each batch starts with a yellow summary header embed showing the county name and record count, followed by up to 5 blurple record-card embeds per message
4. **DM alerts** — Users who subscribed to a county via `/subscribe` receive a DM with a summary header embed and up to 3 record-card previews per scrape cycle
5. **Persistence** — Guild settings, seen records, and subscriptions are stored as JSON files in the `data/` directory and survive restarts

## Data Storage

All data is stored locally in the `data/` directory:

| File | Contents |
|---|---|
| `settings.json` | Per-guild configuration (channel, interval, tracked counties) |
| `seen.json` | Record IDs already posted (capped at 5,000 per county per guild) |
| `subscriptions.json` | User DM subscription entries |

## License

This project is provided as-is for educational and informational purposes. Jail records are sourced from [publicjailrecords.com](https://publicjailrecords.com/publicjailrecords/).

## Contributing

Contributions are welcome. Please open an issue or pull request, I will try to get back to it as soon as I can.
