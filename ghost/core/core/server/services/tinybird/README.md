# Tinybird Service

The Tinybird service provides JWT-based authentication for accessing Tinybird analytics pipes. It generates time-limited JWTs that allow secure access to specific Tinybird data pipes with site-specific filtering.

## Configuration

The service requires the following configuration:

```json
// config.*.json
{
  tinybird: {
    workspaceId: 'your-workspace-id',
    adminToken: 'your-admin-token'
  }
}
```

The service also uses the `site_uuid` setting, which is a default setting available in all Ghost instances.

## Usage

```javascript
const tinybirdService = require('./services/tinybird');

// Generate a JWT token
const token = await tinybirdService.getTinybirdJWT();

// Generate a JWT with custom expiration (default: 10 minutes)
const longToken = await tinybirdService.getTinybirdJWT({
  expiresInMinutes: 60
});

// Check if a token is expired
const isExpired = await tinybirdService.isJWTExpired(token);

// Refresh a token if it's expired
const validToken = await tinybirdService.checkOrRefreshTinybirdJWT(token);
```

## Available Methods

### `getTinybirdJWT(options)`

Generates a new JWT token for accessing Tinybird pipes.

**Parameters:**
- `options.name` (string, optional): Token name, defaults to `tinybird-jwt-{siteUuid}`
- `options.expiresInMinutes` (number, optional): Token expiration in minutes, defaults to 10

**Returns:** Promise<string> - The JWT token

### `isJWTExpired(token, bufferSeconds)`

Checks if a JWT token is expired or will expire soon.

**Parameters:**
- `token` (string): The JWT token to check
- `bufferSeconds` (number, optional): Buffer time in seconds before expiration, defaults to 300 (5 minutes)

**Returns:** Promise<boolean> - True if token is expired or will expire within buffer time

### `checkOrRefreshTinybirdJWT(token)`

Checks if a token is expired and refreshes it if needed.

**Parameters:**
- `token` (string): The JWT token to check

**Returns:** Promise<string> - The original token if valid, or a new token if expired

## Supported Pipes

The service grants access to the following Tinybird pipes:

- `api_kpis`
- `api_active_visitors`
- `api_post_visitor_counts`
- `api_top_browsers`
- `api_top_devices`
- `api_top_locations`
- `api_top_os`
- `api_top_pages`
- `api_top_sources`

All pipes are filtered by the site's UUID automatically.