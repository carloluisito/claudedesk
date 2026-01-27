# Docker Skill

Build and manage Docker images for ClaudeDesk.

## Instructions

When the user runs `/docker`:

### Build Docker Image
```bash
docker build -t claudedesk:local .
```

### Run Docker Container
```bash
docker run -d --name claudedesk -p 8787:8787 claudedesk:local
```

### Stop Container
```bash
docker stop claudedesk && docker rm claudedesk
```

### View Logs
```bash
docker logs claudedesk
```

## Subcommands

- `/docker build` - Build the image
- `/docker run` - Run the container
- `/docker stop` - Stop and remove container
- `/docker logs` - View container logs
- `/docker shell` - Open shell in container: `docker exec -it claudedesk sh`

## Production Images

Production images are automatically built and pushed to GitHub Container Registry on release:
- `ghcr.io/carloluisito/claudedesk:latest`
- `ghcr.io/carloluisito/claudedesk:X.Y.Z`
