import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import { createTransactionalMigration } from '../../utils';

// Saved member views were entries of the `shared_views` setting, which the posts list's saved
// views share. They are segments, and segments are now rows of the `segments` table. This moves
// each site's saved member views out of the setting and into the table, in their order.
//
// A row gets a new id. A view in the setting had none: the segments API made one from the view's
// filter each time it listed the views, and Ghost stored it nowhere. An Admin tab that is open
// while a site updates holds those ids until it reloads.
//
// The table is new in this version and nothing has written to it, so it holds no rows yet.
//
// A name is unique in the table as the database's collation compares names. The setting never
// had that rule, so a site can hold views such as "Cafe" and "Café", which MySQL's default
// collation counts as one name. The first view with a name keeps it, and a later one is stored
// with a number, such as "Café (2)". A name longer than the column holds is cut to fit. The
// database judges every name, by rejecting the row.
//
// Entries that are not segments stay in the setting as they are: the posts list's views, a
// member view without a filter, and anything that can't be read as a view. A filter always fits
// the table: its column holds as much as the whole setting does.

const SETTING = 'shared_views';
const TABLE = 'segments';

/** The most characters the `name` column of the segments table holds. */
const NAME_LENGTH = 191;

/** The most bytes the `value` column of the settings table holds. */
const VALUE_BYTES = 65535;

/**
 * A saved view the segments API listed as a segment: a view of the members list with a name and
 * a filter. Any other entry of the setting is not one.
 */
const SegmentView = z.object({
  route: z.literal('members'),
  name: z.string(),
  color: z.string().optional(),
  icon: z.string().optional(),
  filter: z.object({ filter: z.string().min(1) }).catchall(z.string().nullable()),
});

/** The name and members filter of `entry` when it is a segment, and undefined when it isn't. */
function segmentView(entry: unknown): { name: string; filter: string } | undefined {
  const view = SegmentView.safeParse(entry);
  return view.success ? { name: view.data.name, filter: view.data.filter.filter } : undefined;
}

/** `name`, cut so that it and `suffix` together fit the name column. */
const fitted = (name: string, suffix = '') =>
  [...name].slice(0, NAME_LENGTH - suffix.length).join('') + suffix;

const CodedError = z.object({ code: z.string() });

/** Whether a write failed because a value is already taken, which for these rows is the name. */
function isUniqueViolation(err: unknown): boolean {
  const coded = CodedError.safeParse(err);
  return (
    coded.success &&
    (coded.data.code === 'ER_DUP_ENTRY' || coded.data.code.startsWith('SQLITE_CONSTRAINT'))
  );
}

const SettingRow = z.object({ value: z.string().nullable() });

/** What the setting's value holds as JSON: a list holds the entries, `null` and `{}` hold none. */
const StoredEntries = z.union([z.array(z.unknown()), z.null(), z.record(z.string(), z.never())]);

/**
 * The entries stored in the setting, or undefined when they can't be read: the setting's row is
 * missing, or its value is not a list. A value that is NULL, empty text, `null` or `{}` holds no
 * entries.
 */
async function storedEntries(knex: Knex): Promise<unknown[] | undefined> {
  const setting = SettingRow.safeParse(
    await knex('settings').where({ key: SETTING }).first('value'),
  );
  if (!setting.success) {
    return undefined;
  }
  if (!setting.data.value) {
    return [];
  }
  let json: unknown;
  try {
    json = JSON.parse(setting.data.value);
  } catch {
    return undefined;
  }
  const entries = StoredEntries.safeParse(json);
  if (!entries.success) {
    return undefined;
  }
  return Array.isArray(entries.data) ? entries.data : [];
}

const storeValue = (knex: Knex, value: string) =>
  knex('settings').where({ key: SETTING }).update({ value });

const SegmentRows = z.array(z.object({ name: z.string(), filter: z.string() }));

/** A row of the segments table as this migration writes one, without its name. */
interface SegmentRow {
  id: string;
  filter: string;
  sort_order: number;
  created_at: string;
}

const SettingIdentity = z.object({ id: z.string(), key: z.string(), group: z.string() });

/**
 * Turns the actions History holds for segments into edits of the saved views setting, which is
 * how a version from before this migration logged the same changes. That version can't load
 * History while it holds an action of a kind it doesn't know.
 */
async function logSegmentActionsAsSettingEdits(knex: Knex): Promise<void> {
  const row: unknown = await knex('settings').where({ key: SETTING }).first('id', 'key', 'group');
  const setting = SettingIdentity.safeParse(row);
  if (!setting.success) {
    // Without the setting there is nothing for the actions to be edits of.
    const deleted = await knex('actions').where({ resource_type: 'segment' }).del();
    logging.warn(
      `The saved views setting is missing, so ${deleted} actions logged for segments were deleted`,
    );
    return;
  }
  const { id, key, group } = setting.data;
  const changed = await knex('actions')
    .where({ resource_type: 'segment' })
    .update({
      resource_type: 'setting',
      resource_id: id,
      event: 'edited',
      context: JSON.stringify({ primary_name: key, key, group }),
    });
  logging.info(
    `Turned ${changed} actions logged for segments into edits of the saved views setting`,
  );
}

/**
 * Inserts `row` under the first name the database accepts: `name` with each of `numbers` in
 * turn, where 1 is the name itself, cut to fit. Returns whether one of them was accepted.
 */
async function insertUnderFreeName(
  knex: Knex,
  row: SegmentRow,
  name: string,
  numbers: { from: number; to: number },
): Promise<boolean> {
  // The loop is over the numbers one saved view's name is tried with, not the rows of a table.
  // eslint-disable-next-line no-restricted-syntax
  for (let number = numbers.from; number <= numbers.to; number += 1) {
    try {
      // The row's type is the migration's own: the service's types for the table leave the
      // position to the table's sortable collection.
      await knex<SegmentRow & { name: string }>(TABLE).insert({
        ...row,
        name: number === 1 ? fitted(name) : fitted(name, ` (${number})`),
      });
      return true;
    } catch (err) {
      if (!isUniqueViolation(err)) {
        throw err;
      }
    }
  }
  return false;
}

export default createTransactionalMigration(
  async function up(knex) {
    const entries = await storedEntries(knex);
    if (!entries) {
      logging.warn('The saved views setting cannot be read as views, so none are moved');
      return;
    }
    if (!entries.some((entry) => segmentView(entry))) {
      logging.info('No saved member views are stored, so there are none to move');
      return;
    }

    // The time in UTC as Ghost stores dates. The database's own clock is in the server's zone.
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Each saved member view, with the row it is moved to and the entry's place in the setting.
    const toMove = entries.flatMap((entry, index) => {
      const view = segmentView(entry);
      if (!view) {
        return [];
      }
      const row = {
        id: new ObjectID().toHexString(),
        filter: view.filter,
        sort_order: index,
        created_at: createdAt,
      };
      return [{ index, name: view.name, row }];
    });

    // The loops are over one site's saved views, which one setting holds, not the rows of a
    // table. Every view is first tried under its own name, so that a view only gets a number
    // when an earlier view has its name, and never because a later view was given one.
    /* eslint-disable no-restricted-syntax */
    const clashing: typeof toMove = [];
    for (const view of toMove) {
      if (!(await insertUnderFreeName(knex, view.row, view.name, { from: 1, to: 1 }))) {
        clashing.push(view);
      }
    }
    // With more numbers than there are names, one of them is free.
    const lastNumber = entries.length + 1;
    const unnamed = new Set<number>();
    for (const view of clashing) {
      if (!(await insertUnderFreeName(knex, view.row, view.name, { from: 2, to: lastNumber }))) {
        logging.warn('A saved member view could not be given a name, so it stays in the setting');
        unnamed.add(view.index);
      }
    }
    /* eslint-enable no-restricted-syntax */

    await storeValue(
      knex,
      JSON.stringify(
        entries.filter((entry, index) => unnamed.has(index) || segmentView(entry) === undefined),
      ),
    );
    logging.info(
      `Moved ${toMove.length - unnamed.size} saved member views to the segments table, ${clashing.length - unnamed.size} of them under a numbered name`,
    );
  },
  async function down(knex) {
    await logSegmentActionsAsSettingEdits(knex);

    const rows = SegmentRows.parse(
      await knex(TABLE)
        .select('name', 'filter')
        .orderBy([{ column: 'sort_order' }, { column: 'created_at' }, { column: 'id' }]),
    );
    const views = rows.map(({ name, filter }) => ({ name, route: 'members', filter: { filter } }));
    if (views.length === 0) {
      logging.info('The segments table holds no segments, so there are none to move back');
      return;
    }

    const entries = await storedEntries(knex);
    if (!entries) {
      // Rolling back further drops the table, so going on would lose the segments.
      throw new errors.InternalServerError({
        message:
          'The saved views setting cannot be read as views, so segments cannot be moved back to it',
      });
    }
    // MySQL outside strict mode cuts a value that is too long to fit, without an error, so the
    // length is checked here. Deleting the segments after a cut value was stored would lose them.
    const value = JSON.stringify([...entries, ...views]);
    if (Buffer.byteLength(value) > VALUE_BYTES) {
      throw new errors.InternalServerError({
        message:
          'The saved views setting cannot hold every segment, so segments cannot be moved back to it',
      });
    }
    await storeValue(knex, value);
    await knex(TABLE).del();
    logging.info(`Moved ${views.length} segments back to the saved views setting`);
  },
);
