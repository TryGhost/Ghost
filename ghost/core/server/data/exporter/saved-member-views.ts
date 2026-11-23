import { z } from 'zod';
import {
  SavedMemberView,
  asSavedMemberView,
  savedViewsIn,
  segmentKey,
  segmentsInRows,
} from '../../services/segments/saved-member-views';

// Versions of Ghost from before segments had a table import a site's saved member views from
// the `shared_views` setting, and ignore the `segments` table of an export. An export holds
// each segment in both places, so that those versions import the segments too. The importer of
// this version reads a segment it finds in both places once.

const SETTING = 'shared_views';

/** The most bytes of the setting's value that a version of Ghost stores. */
const VALUE_BYTES = 65535;

/** The row of the saved views setting among an export's settings. Its other fields are kept. */
const SavedViewsSetting = z.looseObject({
  key: z.literal(SETTING),
  value: z.string().nullable(),
});

/**
 * The value of the saved views setting with each of `segments` added as a saved member view,
 * after the views the value holds and in the segments' order. A segment the value already holds
 * as a view, under the same name, is not added again. The value is returned as it is when it
 * can't be read as views, or when the result would be longer than an older version stores.
 */
function withSegments(value: string | null, segments: unknown[]): string | null {
  const views = savedViewsIn(value);
  if (!views) {
    return value;
  }
  const held = new Set(
    views.flatMap((view) => SavedMemberView.safeParse(view).data ?? []).map(segmentKey),
  );
  const added = segmentsInRows(segments)
    .filter((segment) => !held.has(segmentKey(segment)))
    .map(asSavedMemberView);
  if (added.length === 0) {
    return value;
  }
  const next = JSON.stringify([...views, ...added]);
  return Buffer.byteLength(next) > VALUE_BYTES ? value : next;
}

/**
 * An export's `settings` rows, with the rows of its `segments` table added to the saved views
 * setting as saved member views.
 */
export function withSegmentsAsSavedViews(settings: unknown[], segments: unknown[]): unknown[] {
  return settings.map((row) => {
    const setting = SavedViewsSetting.safeParse(row);
    return setting.success
      ? { ...setting.data, value: withSegments(setting.data.value, segments) }
      : row;
  });
}
