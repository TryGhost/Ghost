import * as Sentry from '@sentry/react';
import { getSentryConfig, type SentryConfigInput } from './sentry-config';
import type { ReplayControls } from './automations-replay';

let fullRelease: string | undefined;

/** Initialises Sentry unless a live client exists. */
export function initSentry(input: SentryConfigInput): void {
  const existingClient = Sentry.getClient();
  if (existingClient && existingClient.getOptions().enabled !== false) {
    return;
  }

  Sentry.init(getSentryConfig(input));
  Sentry.addEventProcessor((event) => (fullRelease ? { ...event, release: fullRelease } : event));
  Sentry.setTag('admin_build', getAdminBuild(import.meta.url));
}

/** Ghost(Pro) serves each Admin build from `/admin/<commit sha>/assets/`. */
export function getAdminBuild(assetUrl: string): string | undefined {
  return /\/admin\/([^/]+)\/assets\//.exec(new URL(assetUrl).pathname)?.[1];
}

/** `/site/` only carries the short version; `/config/` has the full one after sign-in. */
export function setSentryFullVersion(version: string | undefined): void {
  fullRelease = version ? `ghost@${version}` : undefined;
}

export function getReplay(): ReplayControls | undefined {
  return Sentry.getClient()?.getIntegrationByName?.<ReturnType<typeof Sentry.replayIntegration>>(
    'Replay',
  );
}
