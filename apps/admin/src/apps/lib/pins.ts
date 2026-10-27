/** The most apps one staff user can have pinned to the sidebar. */
export const MAX_PINNED_APPS = 3;

/** Shown where an app can't be pinned because the sidebar is full. */
export const PINS_FULL_MESSAGE = `Only ${MAX_PINNED_APPS} apps fit. Unpin one to make room.`;

/** What a staff user decided, as saved in their navigation preferences. */
export interface AppPins {
  pinned: string[];
  unpinned: string[];
}

/**
 * The apps pinned to this user's sidebar, in order: the ones they pinned, in the
 * order they pinned them, then the ones they haven't decided on yet, in install
 * order, until there's no more room. Apps no longer installed drop out.
 *
 * `installedIds` are the site's installations, oldest first.
 */
export function resolvePinnedApps(installedIds: string[], pins?: AppPins): string[] {
  const installed = new Set(installedIds);
  const decided = new Set([...(pins?.pinned ?? []), ...(pins?.unpinned ?? [])]);
  const pinned = (pins?.pinned ?? []).filter((id) => installed.has(id));
  const undecided = installedIds.filter((id) => !decided.has(id));

  return [...new Set([...pinned, ...undecided])].slice(0, MAX_PINNED_APPS);
}

/**
 * The preferences to save after pinning or unpinning an app. Every installed app
 * is recorded as one or the other, so a later change doesn't move an app the user
 * hasn't touched into the gap; only apps installed after this are undecided.
 * Pinning with no room left changes nothing.
 */
export function setAppPinned(
  installedIds: string[],
  pins: AppPins | undefined,
  installationId: string,
  pin: boolean,
): AppPins {
  const current = resolvePinnedApps(installedIds, pins);
  let pinned = current.filter((id) => id !== installationId);
  if (pin) {
    pinned =
      current.includes(installationId) || current.length >= MAX_PINNED_APPS
        ? current
        : [...current, installationId];
  }

  return {
    pinned,
    unpinned: installedIds.filter((id) => !pinned.includes(id)),
  };
}
