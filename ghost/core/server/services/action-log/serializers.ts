import { z } from 'zod';
import type { Action } from './models';

/** The options of a request to list actions, as the API framework passes them on. */
export const BrowseActionsRequest = z.object({
  page: z.union([z.number(), z.string()]).optional(),
  limit: z.union([z.number(), z.string()]).optional(),
  filter: z.string().optional(),
  withRelated: z.array(z.string()).optional(),
  context: z.unknown(),
  /** The stored fields to return, or undefined for all of them. */
  columns: z.array(z.string()).optional(),
});

/** Where a page of a list sits in the whole list, as every Admin API list reports it. */
export interface Pagination {
  page: number;
  limit: number | 'all';
  pages: number;
  total: number;
  next: number | null;
  prev: number | null;
}

/** One page of the action log, newest action first. */
export interface ActionsPage {
  actions: Action[];
  pagination: Pagination;
}

const STORED_FIELDS = [
  'id',
  'resource_id',
  'resource_type',
  'actor_id',
  'actor_type',
  'event',
  'context',
  'created_at',
] as const satisfies ReadonlyArray<keyof Action>;

/** Leaves out the keys with no value, so a deleted actor or resource is an empty object. */
function defined<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

/**
 * An action as the actions API returns it. An actor's image is a user's profile image or an
 * integration's icon, and a resource's image is its feature image.
 */
function toActionResponse({ actor, resource, ...stored }: Action, fields?: string[]) {
  return {
    ...(fields
      ? Object.fromEntries(
          STORED_FIELDS.filter((f) => fields.includes(f)).map((f) => [f, stored[f]]),
        )
      : stored),
    ...(actor && {
      actor: defined({
        id: actor.id,
        name: actor.name,
        slug: actor.slug,
        image: stored.actor_type === 'user' ? actor.profile_image : actor.icon_image,
      }),
    }),
    ...(resource && {
      resource: defined({
        id: resource.id,
        title: resource.title,
        slug: resource.slug,
        name: resource.name,
        image: resource.feature_image,
      }),
    }),
  };
}

/**
 * The actions API's response for one page of the action log. `fields` is the stored fields a
 * request asked for, or undefined for all of them. An actor or resource that was asked for is
 * returned whichever fields were.
 */
export function toActionsResponse(page: ActionsPage, fields?: string[]) {
  return {
    actions: page.actions.map((action) => toActionResponse(action, fields)),
    meta: { pagination: page.pagination },
  };
}
