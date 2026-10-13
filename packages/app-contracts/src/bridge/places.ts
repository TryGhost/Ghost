import { z } from 'zod';

// Ghost's IDs are ObjectIds, written in lowercase hex, so anything else names nothing.
const OBJECT_ID = /^[0-9a-f]{24}$/;

const objectId = z
  .string('Expected an ID')
  .regex(OBJECT_ID, 'Expected an ID of 24 lowercase hexadecimal characters');

/**
 * A place in Admin an app can send the publisher to. Places are named rather than given as
 * paths or URLs, so an app can only ever open what Admin has chosen to offer, and Admin
 * decides where each one lives. A new place is a new entry here.
 *
 * Each entry is strict, so an object naming two places, or a place Admin does not know, is
 * refused rather than half-understood.
 *
 * `post` is for posts only: a page has an editor route of its own, so it is named as `page`.
 */
export const PlaceSchema = z.union(
  [
    z.strictObject({ post: z.strictObject({ id: objectId }) }),
    z.strictObject({ page: z.strictObject({ id: objectId }) }),
    z.strictObject({ member: z.strictObject({ id: objectId }) }),
    z.strictObject({ apps: z.literal(true) }),
  ],
  'Expected a place such as { post: { id } }, { page: { id } }, { member: { id } } or { apps: true }',
);

export type Place = z.infer<typeof PlaceSchema>;
