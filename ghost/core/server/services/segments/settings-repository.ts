import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import validator from '@tryghost/validator';
import type { Knex } from 'knex';
import { z } from 'zod';
import { toDatabaseDate } from '../../lib/db-types/date';
import { DbJson } from '../../lib/db-types/json';
import { type Segment, SegmentId } from './models';
import type { SegmentRepository } from './repository';
import type { SegmentChangeAttempt } from './tracking';

type Json = z.core.util.JSONType;
type JsonObject = { [key: string]: Json };

/**
 * A saved view as Admin validates one. The setting also holds the posts list's views and
 * entries that no version of Admin can read, and every write keeps those as they are.
 */
const SharedView = z.object({
  name: z.string(),
  route: z.string(),
  color: z.string().optional(),
  icon: z.string().optional(),
  filter: z.record(z.string(), z.string().nullable()),
});

/** A saved member view: a saved view of the members list. No two have the same name. */
const MemberView = SharedView.extend({ route: z.literal('members') });

/** A saved member view with a filter, which is what a segment is. */
const SegmentView = MemberView.extend({
  filter: z.object({ filter: z.string().min(1) }).catchall(z.string().nullable()),
});

const SettingRow = z.object({ id: z.string(), value: z.string().nullable() }).optional();

/**
 * The saved views a stored value holds. An array holds the views, and `null`, `""` and `{}` hold
 * none. Any other JSON fails to decode, so a write leaves it as it is rather than replacing it.
 */
const StoredViews = DbJson(
  z.codec(
    z.union([z.array(z.json()), z.null(), z.literal(''), z.record(z.string(), z.never())]),
    z.array(z.json()),
    {
      decode: (value) => (Array.isArray(value) ? value : []),
      encode: (views) => views,
    },
  ),
);

/**
 * The views in the setting's stored value, or null when the value can't be read as views. A
 * missing row, and a value that is NULL or empty text, hold no views.
 */
function decodeViews(value: string | null | undefined): Json[] | null {
  if (!value) {
    return [];
  }
  const decoded = StoredViews.safeParse(value);
  return decoded.success ? decoded.data : null;
}

/**
 * The id of a segment. A saved member view has no stored id, and Admin identifies a view by its
 * filter, so the id is the first 24 hex characters of the SHA-256 hash of the filter. Two views
 * only share a filter when they were written to the setting directly, because adding a segment
 * with another segment's filter is rejected. The first of them gets that id. The nth (n ≥ 2) gets
 * the hash of a 0xFF byte followed by `JSON.stringify([filter, n])`: no filter's UTF-8 bytes
 * contain 0xFF, so that hash can't be another segment's, and every segment's id is distinct.
 */
function segmentId(filter: string, occurrence: number): SegmentId {
  const hash = crypto.createHash('sha256');
  if (occurrence === 1) {
    hash.update(filter);
  } else {
    hash.update(Buffer.from([0xff])).update(JSON.stringify([filter, occurrence]));
  }
  return SegmentId.parse(hash.digest('hex').slice(0, 24));
}

/** A segment, with its view as stored and the view's position in the stored views. */
interface ListedSegment {
  segment: Segment;
  view: JsonObject;
  index: number;
}

function listSegments(views: readonly Json[]): ListedSegment[] {
  const occurrences = new Map<string, number>();
  return views.flatMap((view, index) => {
    const parsed = SegmentView.safeParse(view);
    if (!parsed.success || typeof view !== 'object' || view === null || Array.isArray(view)) {
      return [];
    }
    const { name, filter } = parsed.data;
    const occurrence = (occurrences.get(filter.filter) ?? 0) + 1;
    occurrences.set(filter.filter, occurrence);
    const segment = { id: segmentId(filter.filter, occurrence), name, filter: filter.filter };
    return [{ segment, view, index }];
  });
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Whether a saved member view, other than the one at `exceptIndex`, has `name`, ignoring case
 * and surrounding whitespace. Saved member views without a filter count, as they do in Admin.
 */
function isNameTaken(views: readonly Json[], name: string, exceptIndex?: number): boolean {
  const normalized = normalizeName(name);
  return views.some((view, index) => {
    const parsed = MemberView.safeParse(view);
    return (
      index !== exceptIndex && parsed.success && normalizeName(parsed.data.name) === normalized
    );
  });
}

/** Rejects the change `attempt` tracks because another segment has the name. */
export function nameTaken(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('name_taken');
  throw new errors.ValidationError({
    message: 'A view with this name already exists',
    property: 'name',
  });
}

function notFound(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('not_found');
  throw new errors.NotFoundError({ message: 'Segment not found.' });
}

/** The stored views, and the id of the settings row they're stored in, or null when it's missing. */
interface LockedViews {
  settingId: string | null;
  views: Json[];
}

/**
 * Segments stored as Admin's saved member views, in a setting: an entry with the route `members`
 * and a non-empty `filter.filter` is a segment.
 *
 * The setting is a JSON array that the posts list's views share. A write changes the array as it
 * is stored, patching the one entry it changes rather than writing it again from the segment, so
 * entries this code can't read, and keys a segment doesn't have, are written back unchanged.
 *
 * The settings row is read and written with Knex alone. A write does what a settings save does to
 * the row: it checks the value fits the column, sets `updated_at`, and fails as not found when the
 * row is missing. Updating the settings cache and recording History are left to whoever the
 * service reports the change to.
 */
export class SettingsSegmentRepository implements SegmentRepository {
  private readonly key: string;
  private readonly logging: Pick<GhostLogger, 'warn'>;
  private readonly maxValueLength: number;

  constructor({
    key,
    logging,
    maxValueLength,
  }: {
    /** The key of the setting the segments are stored in. */
    key: string;
    logging: Pick<GhostLogger, 'warn'>;
    /** The most characters the settings table's `value` column holds. */
    maxValueLength: number;
  }) {
    this.key = key;
    this.logging = logging;
    this.maxValueLength = maxValueLength;
  }

  async list(executor: Knex): Promise<Segment[]> {
    return listSegments(await this.readViews(executor)).map(({ segment }) => segment);
  }

  async find(id: string, executor: Knex): Promise<Segment | undefined> {
    return (await this.list(executor)).find((segment) => segment.id === id);
  }

  async findForUpdate(id: string, trx: Knex.Transaction): Promise<Segment | undefined> {
    const { views } = await this.lockedViews(trx);
    return listSegments(views).find(({ segment }) => segment.id === id)?.segment;
  }

  async insert(
    input: Omit<Segment, 'id'>,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<Segment> {
    const { settingId, views } = await this.lockedViews(trx);
    if (isNameTaken(views, input.name)) {
      nameTaken(attempt);
    }
    if (listSegments(views).some(({ segment }) => segment.filter === input.filter)) {
      attempt.rejecting('filter_taken');
      throw new errors.ValidationError({
        message: 'A view with this filter already exists',
        property: 'filter',
      });
    }

    const view = { name: input.name, route: 'members', filter: { filter: input.filter } };
    await this.save(trx, settingId, [...views, view], attempt);
    // No other segment has this filter, so this is its first occurrence.
    return { id: segmentId(input.filter, 1), name: input.name, filter: input.filter };
  }

  async update(
    segment: Segment,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<Segment> {
    const { settingId, views } = await this.lockedViews(trx);
    const target =
      listSegments(views).find((listed) => listed.segment.id === segment.id) ?? notFound(attempt);
    if (isNameTaken(views, segment.name, target.index)) {
      nameTaken(attempt);
    }

    // A segment's filter is its id, so only the name can differ from what's stored.
    const renamed = { ...target.view, name: segment.name };
    await this.save(
      trx,
      settingId,
      views.map((view, index) => (index === target.index ? renamed : view)),
      attempt,
    );
    return { ...target.segment, name: segment.name };
  }

  async delete(
    segment: Segment,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<void> {
    const { settingId, views } = await this.lockedViews(trx);
    const target =
      listSegments(views).find((listed) => listed.segment.id === segment.id) ?? notFound(attempt);

    await this.save(
      trx,
      settingId,
      views.filter((_view, index) => index !== target.index),
      attempt,
    );
  }

  /** The stored views. A value that can't be read as views is logged and holds none. */
  private async readViews(executor: Knex): Promise<Json[]> {
    const row: unknown = await executor('settings').where('key', this.key).first('id', 'value');
    const views = decodeViews(SettingRow.parse(row)?.value);
    if (!views) {
      this.logging.warn(
        { event: { name: 'segments.read-saved-views.invalid' } },
        'Saved member views could not be read because shared_views is invalid',
      );
      return [];
    }
    return views;
  }

  /**
   * The stored views, read with the setting's row locked until `trx` ends, so that writes through
   * this repository take turns and none of them overwrites another. `PUT /settings/` doesn't go
   * through this repository yet: it writes the whole value without the lock, so it can still
   * overwrite a segment added a moment earlier. A value that can't be read as views is rejected
   * rather than replaced.
   */
  private async lockedViews(trx: Knex.Transaction): Promise<LockedViews> {
    const row = SettingRow.parse(
      await trx('settings').where('key', this.key).forUpdate().first('id', 'value'),
    );
    const views = decodeViews(row?.value);
    if (!views) {
      throw new errors.ValidationError({
        message: 'Cannot modify saved views because shared_views is invalid',
      });
    }
    return { settingId: row?.id ?? null, views };
  }

  /**
   * Saves `views` as the setting's value. The errors are the ones a settings save gives: not
   * found when the row is missing, and a validation error when the value is longer than the
   * column holds.
   */
  private async save(
    trx: Knex.Transaction,
    settingId: string | null,
    views: Json[],
    attempt: SegmentChangeAttempt,
  ) {
    if (settingId === null) {
      throw new errors.NotFoundError({ message: `Unable to find setting to update: ${this.key}` });
    }
    const value = z.encode(StoredViews, views);
    if (!validator.isLength(value, 0, this.maxValueLength)) {
      attempt.rejecting('stored_views_too_long');
      throw new errors.ValidationError({
        message: `Value in [settings.value] exceeds maximum length of ${this.maxValueLength} characters.`,
        context: 'settings.value',
      });
    }
    await trx('settings')
      .where('id', settingId)
      .update({ value, updated_at: toDatabaseDate(new Date()) });
  }
}
