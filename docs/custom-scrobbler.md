# Setting Up a Custom Scrobbler with Multi-Scrobbler

This guide shows you how to set up [multi-scrobbler](https://github.com/FoxxMD/multi-scrobbler) to act as a proxy between Tidal Hi-Fi and your music services like ListenBrainz, Last.fm, and others.

## Why Use Multi-Scrobbler?

Multi-scrobbler allows you to:

- **Scrobble to multiple services** simultaneously (ListenBrainz, Last.fm, Maloja, etc.)
- **Avoid API rate limits** by batching requests
- **Add additional metadata** and filtering rules
- **Monitor scrobbling activity** via a web dashboard
- **Handle network issues** with retry logic and queuing

## Prerequisites

- Docker and Docker Compose installed on your system
- A ListenBrainz account and token (get yours at [ListenBrainz Settings](https://listenbrainz.org/settings/))

## Step 1: Create Configuration Files

First, create a directory for your multi-scrobbler setup:

```bash
mkdir multi-scrobbler-setup
cd multi-scrobbler-setup
```

### Create `config.json`

This file configures your scrobbling sources and destinations:

```json
{
  "sources": [
    {
      "name": "tidal-hifi-endpoint",
      "type": "endpointlz",
      "data": {
        "token": "tidal-hifi-scrobbles-2025",
        "slug": "tidal"
      }
    }
  ],
  "clients": [
    {
      "name": "listenbrainz",
      "type": "listenbrainz",
      "data": {
        "username": "YOUR_LISTENBRAINZ_USERNAME",
        "token": "YOUR_LISTENBRAINZ_TOKEN"
      }
    }
  ]
}
```

**Replace the following values:**

- `YOUR_LISTENBRAINZ_USERNAME`: Your ListenBrainz username
- `YOUR_LISTENBRAINZ_TOKEN`: Your ListenBrainz user token

> **Security Note:** The `token` field under sources (`tidal-hifi-scrobbles-2025`) is a security token that Tidal Hi-Fi will use to authenticate with multi-scrobbler. You can change this to any secure string you prefer.

### Create `docker-compose.yml`

```yaml
name: multi-scrobbler

services:
  multi-scrobbler:
    image: foxxmd/multi-scrobbler:latest
    restart: unless-stopped
    volumes:
      - ./data:/config
      - ./config.json:/config/config.json:ro
    ports:
      - 9078:9078 # Web UI and API
    environment:
      TZ: Europe/Amsterdam  # Change to your timezone
      # Set if running on a different machine or domain
      BASE_URL: http://localhost:9078
      # Linux host permissions
      PUID: 1000  # Your user ID (run `id -u` to find yours)
      PGID: 1000  # Your group ID (run `id -g` to find yours)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9078/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

networks:
  default:
    name: multi-scrobbler-net
```

**Customize these values if needed:**

- `TZ`: Set to your timezone (e.g., `America/New_York`, `Europe/London`)
- `PUID`/`PGID`: Run `id -u` and `id -g` to get your user/group IDs
- `BASE_URL`: Change if accessing from a different machine or domain

## Step 2: Start Multi-Scrobbler

Run the service:

```bash
docker compose up -d
```

Verify it's running:

```bash
docker compose logs -f
```

You should see logs indicating the service started successfully. The web dashboard will be available at <http://localhost:9078>.

## Step 3: Configure Tidal Hi-Fi

Now configure Tidal Hi-Fi to use your multi-scrobbler instance:

1. **Open Tidal Hi-Fi Settings** (Ctrl+0 or Ctrl+=)
2. **Navigate to the ListenBrainz section**
3. **Configure the following:**
   - **Enable ListenBrainz**: ✅ Checked
   - **API URL**: `http://localhost:9078/api/listenbrainz/tidal`
   - **User Token**: `tidal-hifi-scrobbles-2025` (or your custom token from config.json)
   - **Delay**: `5000` (5 seconds, adjust as needed)

4. **Save the settings & restart Tidal**

## Step 4: Test the Setup

1. **Check the Multi-Scrobbler Dashboard**:
   - Open <http://localhost:9078> in your browser
   - You should see your configured source and client
   - Monitor the "Recent Activity" section

2. **Play a song in Tidal Hi-Fi**:
   - Start playing any track
   - Watch the multi-scrobbler logs: `docker compose logs -f`
   - Check your ListenBrainz profile for new scrobbles

## Troubleshooting

### Common Issues

**"Connection refused" errors:**

- Ensure multi-scrobbler is running: `docker compose ps`
- Check if port 9078 is accessible: `curl http://localhost:9078/health`

**"Invalid token" errors:**

- Verify the token in Tidal Hi-Fi matches the one in `config.json`
- Check that the token doesn't have extra spaces or characters

**Scrobbles not appearing:**

- Verify your ListenBrainz token is correct and has appropriate permissions
- Check the multi-scrobbler logs for error messages
- Ensure your ListenBrainz username is spelled correctly

## Advanced Configuration

### Adding More Scrobble Targets

You can add multiple clients to scrobble to several services simultaneously. Edit your `config.json`:

```json
{
  "sources": [
    {
      "name": "tidal-hifi-endpoint",
      "type": "endpointlz",
      "data": {
        "token": "tidal-hifi-scrobbles-2025",
        "slug": "tidal"
      }
    }
  ],
  "clients": [
    {
      "name": "listenbrainz",
      "type": "listenbrainz",
      "data": {
        "username": "YOUR_LISTENBRAINZ_USERNAME",
        "token": "YOUR_LISTENBRAINZ_TOKEN"
      }
    },
    {
      "name": "lastfm",
      "type": "lastfm",
      "data": {
        "username": "YOUR_LASTFM_USERNAME",
        "password": "YOUR_LASTFM_PASSWORD",
        "apiKey": "YOUR_LASTFM_API_KEY",
        "secret": "YOUR_LASTFM_SECRET"
      }
    }
  ]
}
```

### Remote Access

If you want to access multi-scrobbler from another machine:

1. **Update `BASE_URL`** in docker-compose.yml to your server's IP/domain
2. **Update the API URL** in Tidal Hi-Fi to match your server address
3. **Ensure firewall allows** port 9078

## Support

- **Multi-Scrobbler Documentation**: <https://foxxmd.github.io/multi-scrobbler/>
- **Tidal Hi-Fi Issues**: <https://github.com/Mastermindzh/tidal-hifi/issues>
- **Multi-Scrobbler Issues**: <https://github.com/FoxxMD/multi-scrobbler/issues>
