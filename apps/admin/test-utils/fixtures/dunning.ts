export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A host-config dunning block `elapsedDays` into a `windowDays`-day
 * paymentFailedAt -> suspendsAt window. Anchored on `now` (defaults to the
 * current clock, so tests under fake timers get their frozen time).
 */
export function dunningWindow(
  elapsedDays: number,
  { windowDays = 28, now = Date.now() }: { windowDays?: number; now?: number } = {},
) {
  return {
    active: true,
    paymentFailedAt: new Date(now - elapsedDays * DAY_MS).toISOString(),
    suspendsAt: new Date(now + (windowDays - elapsedDays) * DAY_MS).toISOString(),
  };
}

/**
 * A mocked `useBrowseConfig` return for a host carrying the given dunning
 * block, with the dunningWarnings flag on unless overridden via `labs`.
 */
export function browseConfigWithDunning(
  dunning?: unknown,
  labs: Record<string, boolean> = { dunningWarnings: true },
) {
  return {
    data: {
      config: {
        labs,
        hostSettings: {
          billing: { enabled: true, url: 'https://billing.example.com', dunning },
        },
      },
    },
  };
}
