/**
 * The statuses of a staff user who may sign in and act, which the `User` model reads as its
 * active states. A `warn-*` user has failed some sign-ins and isn't locked yet.
 */
export const ACTIVE_STAFF_STATUSES: readonly string[] = [
  'active',
  'warn-1',
  'warn-2',
  'warn-3',
  'warn-4',
];

export function isActiveStaffStatus(status: unknown): boolean {
  return typeof status === 'string' && ACTIVE_STAFF_STATUSES.includes(status);
}
