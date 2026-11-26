import { z } from 'zod';
import { normalizeName } from './models';

// Versions of Ghost from before segments had a table stored each segment as an entry of the
// `shared_views` setting: a saved view of the members list with a filter, beside the posts
// list's saved views. A site export from one of those versions holds its segments in that form,
// and an export from this version holds them in that form as well as in the segments table, so
// that those versions can import it. This is what such an entry is, for the export and the
// import to share.

/**
 * A segment as an export holds one. A row of the segments table has the slug the segment had on
 * the site it was exported from, which an import keeps when it is free; a saved member view in
 * the setting has none.
 */
const ExportedSegment = z.object({
  name: z.string(),
  filter: z.string(),
  // A slug that isn't text is left out rather than leaving the segment out.
  slug: z.string().optional().catch(undefined),
});
export type ExportedSegment = z.infer<typeof ExportedSegment>;

/**
 * A key two segments share when an export and an import count them as one segment: the same
 * filter under the same name, as names are compared. Two segments can have one filter under
 * different names, and those are two segments.
 */
export const segmentKey = ({ name, filter }: ExportedSegment) =>
  JSON.stringify([normalizeName(name), filter]);

/** A row of the segments table in an export. */
const ExportedRow = ExportedSegment.extend({ sort_order: z.number().catch(0) });

/** The segments among the rows of an export's `segments` table, in their order. */
export function segmentsInRows(rows: unknown[]): ExportedSegment[] {
  return rows
    .flatMap((row) => ExportedRow.safeParse(row).data ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ExportedSegment.parse(row));
}

/**
 * An entry of the setting that is a segment: a saved view of the members list with a name and a
 * filter. It reads as the segment it holds. Any other entry of the setting is not one: the posts
 * list's views, a member view without a filter, and anything that can't be read as a view.
 */
export const SavedMemberView = z
  .object({
    route: z.literal('members'),
    name: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    filter: z.object({ filter: z.string().min(1) }).catchall(z.string().nullable()),
  })
  .transform(({ name, filter }): ExportedSegment => ({ name, filter: filter.filter }));

/** `segment` as an entry of the setting. */
export const asSavedMemberView = ({ name, filter }: ExportedSegment) => ({
  name,
  route: 'members',
  filter: { filter },
});

/** What the setting's value holds as JSON: a list holds the entries, `null` and `{}` hold none. */
const StoredViews = z.union([z.array(z.unknown()), z.null(), z.record(z.string(), z.never())]);

/**
 * The entries a value of the setting holds, or undefined when the value can't be read as
 * entries. A value that is missing, NULL, empty text, `null` or `{}` holds none.
 */
export function savedViewsIn(value: unknown): unknown[] | undefined {
  if (value === undefined || value === null || value === '') {
    return [];
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    return undefined;
  }
  const views = StoredViews.safeParse(json);
  if (!views.success) {
    return undefined;
  }
  return Array.isArray(views.data) ? views.data : [];
}
