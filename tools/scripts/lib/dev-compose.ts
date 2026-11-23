import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

export interface ComposeService {
  image?: string;
  profiles?: string[];
  environment?: Record<string, string | null>;
  ports?: { target: number; published?: string }[];
  depends_on?: Record<string, { condition: string }>;
}

export interface ComposeConfig {
  services: Record<string, ComposeService>;
  volumes?: Record<string, { name?: string }>;
}

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

/** Whether Mailgun credentials are in the environment or the `.env` file compose reads */
export function hasMailgunCredentials(): boolean {
  const envFile = join(repoRoot, '.env');
  const dotenv = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
  const value = (key: string) => process.env[key] ?? dotenv[key];
  return Boolean(value('MAILGUN_API_KEY') && value('MAILGUN_DOMAIN'));
}

const MAILGUN_OVERLAYS = new Set(['compose.dev.mailgun.yaml', 'compose.dev.fake-mailgun.yaml']);

/**
 * The overlays' `-f` arguments in DEV_COMPOSE_FILES, e.g. `-f compose.dev.analytics.yaml`.
 * With Mailgun credentials, Ghost sends all email through Mailgun unless an overlay already
 * configures Mailgun, such as the fake one.
 */
export function overlayArgs(): string[] {
  const args = (process.env.DEV_COMPOSE_FILES ?? '').split(/\s+/).filter(Boolean);
  if (!args.some((arg) => MAILGUN_OVERLAYS.has(arg)) && hasMailgunCredentials()) {
    args.push('-f', 'compose.dev.mailgun.yaml');
  }
  return args;
}

/** The dev compose configuration with the overlays applied, Ghost's own container included */
export function composeConfig(overlays: string[]): ComposeConfig {
  const args = ['compose', '-f', 'compose.dev.yaml', ...overlays];
  // A --profile flag replaces COMPOSE_PROFILES instead of adding to it
  const profiles = [process.env.COMPOSE_PROFILES, 'docker-dev'].filter(Boolean).join(',');
  return JSON.parse(
    execFileSync('docker', [...args, 'config', '--format', 'json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, COMPOSE_PROFILES: profiles },
    }),
  ) as ComposeConfig;
}

/**
 * What the overlays add to the ghost-dev service's environment, rewritten for Ghost on
 * the host: service hostnames become 127.0.0.1 and the port the service publishes, and
 * the gateway's port 2368 becomes this checkout's Admin dev server.
 */
export function hostOverlayEnv(
  base: ComposeConfig,
  config: ComposeConfig,
  frontDoorHostname: string,
  frontDoorPort: string,
): Record<string, string> {
  const { services } = config;
  const toHost = (key: string, value: string) => {
    // Only host settings name a bare service: the S3 bucket is also called ghost-dev
    if (/host$/i.test(key) && services[value]) {
      return '127.0.0.1';
    }
    return value.replace(
      /^(\w+:\/\/)([^/:]+)(?::(\d+))?/,
      (match, scheme: string, host: string, port: string | undefined) => {
        if (host === 'localhost' || host === '127.0.0.1') {
          if (port !== '2368') {
            return match;
          }
          return `${scheme}${host === 'localhost' ? frontDoorHostname : host}:${frontDoorPort}`;
        }
        if (!services[host]) {
          return match;
        }
        const published = services[host].ports?.find(
          ({ target }) => String(target) === port,
        )?.published;
        if (!published) {
          throw new Error(
            `${key}: ${host}:${port ?? ''} has to be published for Ghost to reach it from the host`,
          );
        }
        return `${scheme}127.0.0.1:${published}`;
      },
    );
  };

  const baseEnv = base.services['ghost-dev']?.environment ?? {};
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(services['ghost-dev']?.environment ?? {})) {
    if (value !== null && value !== baseEnv[key]) {
      env[key] = toHost(key, value);
    }
  }
  return env;
}
