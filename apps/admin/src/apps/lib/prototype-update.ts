import type { AppInstallation } from '@/apps/types';
import { pinOnInstall } from '@/apps/lib/pins';

/**
 * Exploration: a hard-coded app that's been updated and needs more access, so
 * the review flow can be tried without a second version of a real app. It's
 * added once per browser; uninstalling it keeps it gone. Delete the flag in
 * localStorage to bring it back.
 */
const SEEDED_KEY = 'ghost-admin:apps:prototype-update-seeded';

const PROTOTYPE_UPDATE: AppInstallation = {
  id: 'prototype-comment-digest',
  manifestUrl: 'https://comment-digest.example/manifest.json',
  manifest: {
    name: 'Comment digest',
    developer: 'Northwind Studio',
    description:
      'A weekly round-up of the busiest conversations on your site, emailed to the members taking part.',
    icon: 'message-square-text',
    color: '#4f46e5',
    url: 'https://comment-digest.example/',
    surfaces: ['page'],
  },
  source: 'link',
  status: 'active',
  installedAt: '2026-09-14T09:30:00.000Z',
  permissions: [
    { resource: 'post', actions: ['browse', 'read'] },
    { resource: 'comment', actions: ['browse', 'read'] },
  ],
  pendingPermissions: [
    { resource: 'comment', actions: ['moderate'] },
    { resource: 'member', actions: ['browse', 'read'] },
    { resource: 'mail', actions: ['send'] },
  ],
};

/** Returns `installations` with the prototype added the first time, else unchanged. */
export function seedPrototypeUpdate(installations: AppInstallation[]): AppInstallation[] {
  if (import.meta.env.MODE === 'test') {
    return installations;
  }
  try {
    if (window.localStorage.getItem(SEEDED_KEY)) {
      return installations;
    }
    window.localStorage.setItem(SEEDED_KEY, '1');
  } catch {
    return installations;
  }
  // Pinned like a fresh install, once the read that seeded it has finished.
  queueMicrotask(() => pinOnInstall(PROTOTYPE_UPDATE.id));
  return [...installations, PROTOTYPE_UPDATE];
}
