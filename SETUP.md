# ClaudeDesk Setup Guide

ClaudeDesk is an AI-powered development platform that lets you work with Claude Code from any device.

## Installation

### Option 1: npm (Recommended)

```bash
# Install globally
npm install -g claudedesk

# Run
claudedesk
```

Or run without installing:
```bash
npx claudedesk
```

**Prerequisites:** Node.js 18+ and [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

### Option 2: Docker

```bash
cd deploy
cp .env.example .env
docker compose up -d
```

See [deploy/README.md](deploy/README.md) for details.

**Prerequisites:** Docker Engine 20.10+, Docker Compose 2.0+

### Option 3: From Source (Development)

```bash
git clone https://github.com/carloluisito/claudedesk.git
cd claude-desk
npm install
npm run dev
```

**Prerequisites:** Node.js 18+, npm, Git, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

## First Run

Open http://localhost:8787 in your browser.

The **Setup Wizard** will guide you through:

1. **Mobile Access** - Enable secure tunnel for phone access
2. **Add Repository** - Point to your local projects
3. **GitHub** - Connect for pushing branches (optional)
4. **Claude CLI** - Verify installation
5. **Voice Control** - Set up Whisper (optional)

## CLI Options

```bash
claudedesk [options]

Options:
  --port <port>          Port to listen on (default: 8787)
  --data-dir <path>      Data directory for config and artifacts
  --skip-wizard          Skip the initial setup wizard
  --allow-remote         Allow remote network access
  --no-open              Don't auto-open the browser on startup
  --check-update         Check for a newer version and exit
  --update               Check and install update if available, then exit
  --clear-cache [type]   Clear cached data and exit (types: sessions, artifacts, worktrees, usage, all)
  --help                 Show help message
  --version              Show version number
```

### Examples

```bash
# Custom port
claudedesk --port 3000

# Custom data directory
claudedesk --data-dir /opt/claudedesk

# Skip wizard for automated deployments
claudedesk --skip-wizard
```

## Configuration

### Data Directory

ClaudeDesk stores config and data in:
- **Linux/macOS:** `~/.claudedesk`
- **Windows:** `%APPDATA%\claudedesk`

Override with `--data-dir` or `CLAUDEDESK_DATA_DIR` environment variable.

### Configuration Files

Inside the data directory:

- `config/settings.json` - App settings
- `config/repos.json` - Repository definitions
- `config/workspaces.json` - Workspace configurations
- `config/mcp-servers.json` - MCP server configurations
- `config/pipeline-monitors.json` - CI/CD pipeline monitor state
- `config/ideas.json` - Saved ideas (brainstorming sessions)
- `config/skills/` - Custom Claude skills

## Mobile Access

ClaudeDesk uses Cloudflare Tunnel for secure remote access:

1. Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
2. Enable mobile access in the Setup Wizard or Settings > Mobile
3. Scan the QR code with your phone
4. Add to home screen for PWA experience

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDEDESK_PORT` | 8787 | Port to listen on |
| `CLAUDEDESK_DATA_DIR` | `~/.claudedesk` | Data directory |
| `CLAUDEDESK_TOKEN` | `claudedesk-local` | Auth token override (use a strong value if exposed to a network) |
| `VITE_DEV_PORT` | 5173 | Vite dev server port (for running dev alongside production) |
| `ALLOW_REMOTE` | false | Allow remote access |
| `GITHUB_CLIENT_ID` | - | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | - | GitHub OAuth |
| `GITLAB_CLIENT_ID` | - | GitLab OAuth |
| `GITLAB_CLIENT_SECRET` | - | GitLab OAuth |

## Troubleshooting

### "Command not found: claudedesk"

```bash
# Use npx instead
npx claudedesk

# Or add npm global bin to PATH
export PATH="$PATH:$(npm config get prefix)/bin"
```

### "Port already in use"

```bash
claudedesk --port 3000
```

### "Claude CLI not found"

Install Claude Code CLI from https://docs.anthropic.com/en/docs/claude-code

ClaudeDesk will show a warning but continue running without terminal features.

### "cloudflared not found"

Install cloudflared from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

This is only needed for mobile access.

## Building from Source

```bash
# Build both server and client
npm run build

# Start production server
npm start

# Or use the CLI
node dist/cli.js
```

## Support

Report issues at https://github.com/carloluisito/claudedesk/issues
