/**
 * Minimal mirror of the @tryghost/adapter-base-route-settings type surface the
 * ported api-adapter uses (the npm package is not depended on — these are
 * types only, no runtime). Mirrors adapter-base-route-settings@ the version
 * pinned by ghost/core at 407e032dc7.
 */

export type DataShortFormResource = 'tag' | 'author' | 'post' | 'page' | 'previews' | 'email';

/** e.g. 'tag.food' */
export type DataShortForm = string;

export interface DataLongFormEntry {
  type: 'read' | 'browse';
  resource: string;
  /** required for `read` entries, absent on `browse` */
  slug?: string;
  redirect?: boolean;
  limit?: number | string;
  order?: string;
  filter?: string;
  include?: string;
  visibility?: string;
  status?: string;
  page?: number | string;
  [key: string]: unknown;
}

export type DataEntry = DataShortForm | DataLongFormEntry;

export type RouteData = DataShortForm | Record<string, DataEntry>;
