# SDK Configuration

## Configuration File

Create a configuration file in your project root. Supported formats (in priority order):

1. `tinybird.config.mjs` - ESM with dynamic logic
2. `tinybird.config.cjs` - CommonJS with dynamic logic
3. `tinybird.config.json` - Standard JSON (default)
4. `tinybird.json` - Legacy format

## Configuration Options

```json
{
  "include": [
    "src/tinybird/datasources.ts",
    "src/tinybird/pipes.ts",
    "src/tinybird/legacy.datasource",
    "src/tinybird/legacy.pipe"
  ],
  "token": "${TINYBIRD_TOKEN}",
  "baseUrl": "https://api.tinybird.co",
  "devMode": "branch"
}
```

## Configuration Fields

- `include`: Array of file paths to include (TypeScript files and legacy `.datasource`/`.pipe` files)
- `token`: API token, supports environment variable interpolation with `${VAR_NAME}`
- `baseUrl`: Tinybird API base URL
- `devMode`: Development mode (`branch` for cloud branches, `local` for local container)

## Mixed Formats

You can combine TypeScript files with legacy `.datasource` and `.pipe` files for gradual migration:

```json
{
  "include": [
    "src/tinybird/datasources.ts",
    "src/tinybird/pipes.ts",
    "legacy/events.datasource",
    "legacy/analytics.pipe"
  ]
}
```

## Path Alias Configuration

Add to `tsconfig.json` for cleaner imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@tinybird/client": ["./src/tinybird/client.ts"]
    }
  }
}
```
