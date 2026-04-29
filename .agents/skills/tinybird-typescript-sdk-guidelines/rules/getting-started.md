# Tinybird TypeScript SDK Overview

## What is it

The `@tinybirdco/sdk` is a TypeScript package that enables developers to define Tinybird resources with complete type inference. You can author datasources, pipes, and queries in TypeScript, then synchronize them directly to Tinybird.

## Requirements

- TypeScript: Version 4.9 or higher
- Node.js: 20 LTS or later (non-EOL versions officially supported)
- Server-side only; web browsers are not supported to protect API credentials

## Installation

```bash
npm install @tinybirdco/sdk
```

## Project Initialization

```bash
npx tinybird init
npx tinybird init --force          # Overwrite existing files
npx tinybird init --skip-login     # Skip browser authentication
```

This generates:
- `tinybird.config.json` - Configuration file
- `src/tinybird/datasources.ts` - Data source definitions
- `src/tinybird/pipes.ts` - Pipe/endpoint definitions
- `src/tinybird/client.ts` - Typed client

## Environment Setup

Create `.env.local`:
```
TINYBIRD_TOKEN=p.your_token_here
```

## Key Features

- Full type inference with autocomplete for datasources and pipes
- Type-safe data ingestion catching schema mismatches at development time
- Typed query results based on endpoint definitions
- Mixed formats: combine TypeScript with legacy `.datasource`/`.pipe` files
- Branch safety: dev mode blocks deployment to main branch
