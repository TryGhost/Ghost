import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import { Metafield } from './models';
import { FieldTypeSchema, type FieldType } from '@tryghost/metafield-types';
import { metafieldCodec } from './codec';
import { type Key, KeySchema, type Namespace } from '@tryghost/metafield-types/identity';
import type { Namespaces } from './namespaces';
import { FIELD_STATUS, FieldStatusSchema } from './schema';
import {
  ADMIN,
  MEMBER_ACCESS,
  MemberAccessSchema,
  type Audience,
  type MemberAccess,
} from './access';
import {
  ACTIVE_ONLY,
  ANY_STATUS,
  FIELDS_TABLE,
  inFieldOrder,
  nql,
  type DefinitionQuery,
  type FieldIdentity,
  type FieldSource,
} from './queries';
import { mintableKey } from './key';
import { parseRequest } from '../../lib/parse-request';
import { type RecordMetafieldAction, type RequestContext } from './actions';
import type { MetafieldsTracking } from './tracking';

// Column limits come from the canonical schema — the same source the migration and
// Bookshelf models read — so the service can never drift from the database. The
// name cap turns an over-long input into a clean 422 (not a DB error), and the key
// base is capped so even the longest collision suffix stays within the column.
const columns = require('../../data/schema').tables[FIELDS_TABLE];
const MAX_NAME_LENGTH: number = columns.name.maxlength;
const MAX_KEY_LENGTH: number = columns.key.maxlength;
const MAX_KEY_ITERATIONS = 1000;
// Reserve room for a `_<n>` suffix (n up to MAX_KEY_ITERATIONS).
const MAX_KEY_BASE_LENGTH = MAX_KEY_LENGTH - (String(MAX_KEY_ITERATIONS).length + 1);

// A key becomes a property name on the plain objects that carry a member's values —
// on both sides of the wire, since `custom_fields` is JSON and a client gets a plain
// object from JSON.parse. A key naming a member of Object.prototype reads back as
// inherited rather than absent wherever one of those objects is indexed.
//
// Derived rather than listed, from the format a key may take rather than from how one
// is minted: a caller can state a key instead of deriving it from a name, so what has
// to be reserved is every prototype name a well-formed key could spell. The ones that
// carry a capital cannot be spelled at all and need no reserving; `constructor` and
// `__proto__` can.
const RESERVED_KEYS = Object.getOwnPropertyNames(Object.prototype).filter(
  (name) => KeySchema.safeParse(name).success,
);

const FieldName = z
  .string()
  .trim()
  .min(1, { message: 'Custom field name is required.' })
  .max(MAX_NAME_LENGTH, { message: 'Custom field name is too long.' });

const FieldAccess = z.object({ member: MemberAccessSchema });

// No key: the backend mints it from the name.

const AddFieldInput = z.object({
  name: FieldName,
  type: FieldTypeSchema,
  access: FieldAccess.optional(),
});

// A bound on the work one request can ask for, separate from how many definitions
// a site may hold in total. Every definition in a batch costs several queries
// inside one open write transaction, so an operator raising the site ceiling must
// not also mean a single request can ask for an unbounded amount of that work.
const MAX_FIELDS_PER_REQUEST = 100;

// Create accepts a batch. The framework guarantees a non-empty array by the time a
// query runs, but the service validates the whole payload up front so a bad item
// anywhere fails the request before anything is written.
const AddFieldsInput = z
  .array(AddFieldInput)
  .min(1)
  .max(MAX_FIELDS_PER_REQUEST, {
    message: `Custom fields can only be created ${MAX_FIELDS_PER_REQUEST} at a time.`,
  });

// Only the key is read; the client sends whole field objects because that is the shape
// the API speaks in.
const ReorderInput = z
  .array(
    z.object({
      key: z
        .string()
        .min(1, { message: 'Every custom field in the order needs a key.' })
        .pipe(KeySchema),
    }),
  )
  .min(1, { message: 'The order must name every custom field.' });

// Name, status and access are mutable. `key` and `type` are accepted so the
// immutability rules can reject a change loudly; they are never persisted.
const EditFieldInput = z.object({
  name: FieldName.optional(),
  status: FieldStatusSchema.optional(),
  access: FieldAccess.optional(),
  key: z.optional(KeySchema),
  type: FieldTypeSchema.optional(),
});

export class MetafieldDefinitionsService {
  private knex: Knex;
  private fields: FieldSource;
  private recordAction: RecordMetafieldAction;
  private namespaces: Namespaces;
  private tracking: MetafieldsTracking;

  constructor({
    knex,
    fields,
    recordAction,
    namespaces,
    tracking,
  }: {
    knex: Knex;
    fields: FieldSource;
    recordAction: RecordMetafieldAction;
    namespaces: Namespaces;
    tracking: MetafieldsTracking;
  }) {
    this.knex = knex;
    this.fields = fields;
    this.recordAction = recordAction;
    this.namespaces = namespaces;
    this.tracking = tracking;
  }

  async browse(
    options: { namespace: Namespace; filter?: string },
    audience: Audience,
  ): Promise<Metafield[]> {
    // Whichever set comes back, it comes back in the publisher's order: filtering
    // narrows the list, it never reorders it.
    const { namespace, filter } = options;
    if (filter) {
      // A filter naming `status` decides the statuses itself, which is how Settings
      // pulls active and archived together in one request
      // (`filter=status:[active,archived]`). One that does not gets the same active-only
      // scope as an unfiltered read.
      const parsed = parseFilter(filter);
      return this.list(
        this.fields.definitions(this.knex, {
          audience,
          status: filterReferencesStatus(parsed) ? ANY_STATUS : ACTIVE_ONLY,
          namespace,
          filter: parsed,
        }),
      );
    }
    return this.list(
      this.fields.definitions(this.knex, { audience, status: ACTIVE_ONLY, namespace }),
    );
  }

  private async list(query: DefinitionQuery): Promise<Metafield[]> {
    const rows = await inFieldOrder(query.read).select('*');
    return rows.map((row) => z.decode(metafieldCodec, row));
  }

  async read(namespace: Namespace, key: Key, audience: Audience): Promise<Metafield> {
    const [field] = await this.list(
      this.fields.definitions(this.knex, {
        audience,
        status: ANY_STATUS,
        field: { namespace, key },
      }),
    );
    if (!field) {
      throw new errors.NotFoundError({ message: 'Custom field not found.' });
    }
    return field;
  }

  /**
   * Create one or more field definitions. All-or-nothing: the batch runs in a
   * single transaction, so a name clash or the operational cap on the third item
   * leaves the first two unwritten rather than half-applying the request.
   *
   * Running inside the transaction also makes a batch self-consistent for free —
   * `assertNameAvailable` and `mintKey` see the rows inserted earlier in the same
   * batch, so two items sharing a name are caught and two items deriving the same
   * key get distinct ones, exactly as if they had arrived as separate requests.
   */
  async add(context: RequestContext, namespace: Namespace, input: unknown): Promise<Metafield[]> {
    return this.tracking.definition('create', async (attempt) => {
      await this.namespaces.assertChangeable(namespace);
      const requestedCount = Array.isArray(input) ? input.length : 0;

      const parsed = AddFieldsInput.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new errors.ValidationError({
          message: issue.message,
          property: propertyOf(issue.path),
          context: batchContext(issue.path[0], requestedCount),
        });
      }
      const fields = parsed.data;
      attempt.fields(fields);

      // Mint before opening the transaction: it needs no database access, and
      // an unusable name is a payload problem worth reporting on its own terms.
      const bases = fields.map((field, index) => {
        const base = mintableKey(field.name);
        if (!base) {
          throw new errors.ValidationError({
            message: 'Custom field name must contain at least one usable character.',
            property: 'name',
            context: batchContext(index, requestedCount),
          });
        }
        return base;
      });

      let created: Metafield[];
      try {
        created = await this.knex.transaction(async (trx) => {
          await this.assertRoom(trx, namespace, fields.length);

          // Read once, before the loop: a batch appends as consecutive ranks, so
          // the five fields of one request land in the order the request gave
          // them rather than all sharing the end of the list.
          const firstSortOrder = await this.nextSortOrder(trx, namespace);

          const keys: Key[] = [];
          for (const [index, field] of fields.entries()) {
            await this.assertNameAvailable(trx, namespace, field.name);
            const key = await this.mintKey(trx, namespace, bases[index]);
            await this.insertField(trx, {
              namespace,
              key,
              name: field.name,
              type: field.type,
              memberAccess: field.access?.member ?? MEMBER_ACCESS.none,
              sortOrder: firstSortOrder + index,
            });
            keys.push(key);
          }
          return this.readMany(trx, namespace, keys);
        });
      } catch (err) {
        // mintKey already picked a free key, so a unique violation here only
        // means a concurrent create claimed the same key in between. The index
        // is the final arbiter; surface a retryable conflict rather than a 500.
        if (isUniqueConstraintViolation(err)) {
          throw new errors.ConflictError({
            message: 'Could not create the custom field, please try again.',
          });
        }
        throw err;
      }

      // Logged after the commit: the action log is a separate Bookshelf write
      // outside this transaction, so recording inside it would leave orphaned
      // "added" entries for fields a rollback never created.
      await this.recordCreated(context, created);
      return created;
    });
  }

  /**
   * Given an executor it joins that transaction; given none it opens its own. Unlike
   * `add`, the key is stated rather than minted from the name, and nothing about it is
   * worked around: a caller states a key because something else already names that key,
   * so a variant of it would be a field nothing points at.
   *
   * The field is returned rather than logged: the history writes on its own connection,
   * which a single-connection pool would deadlock against an open transaction.
   */
  async addOne(
    namespace: Namespace,
    wanted: {
      key: string;
      name: string;
      type: FieldType;
      access: z.infer<typeof FieldAccess>;
    },
    { executor = this.knex }: { executor?: Knex } = {},
  ): Promise<Metafield> {
    await this.namespaces.assertChangeable(namespace);
    // Before any database access, the way `add` mints before opening its transaction:
    // an unusable key is a payload problem worth reporting on its own terms.
    const key = usableKey(wanted.key);

    const write = async (db: Knex) => {
      await this.assertRoom(db, namespace, 1);
      await this.assertKeyAvailable(db, { namespace, key });
      await this.assertNameAvailable(db, namespace, wanted.name);

      await this.insertField(db, {
        namespace,
        key,
        name: wanted.name,
        type: wanted.type,
        memberAccess: wanted.access.member,
        sortOrder: await this.nextSortOrder(db, namespace),
      });
      const [created] = await this.readMany(db, namespace, [key]);
      return created;
    };

    // knex's marker for a transactor: join it rather than nesting a savepoint under it.
    return executor.isTransaction ? write(executor) : executor.transaction(write);
  }

  /**
   * Only for a stated key. Minting picks a free one instead, so this reads as a clean 422
   * where the unique index would read as a 500.
   */
  private async assertKeyAvailable(db: Knex, field: FieldIdentity): Promise<void> {
    const taken = await db(FIELDS_TABLE)
      .where({ namespace: field.namespace, key: field.key })
      .first();
    if (taken) {
      throw new errors.ValidationError({
        message: 'A custom field with this key already exists.',
        property: 'key',
      });
    }
  }

  private async insertField(
    db: Knex,
    field: {
      namespace: Namespace;
      key: Key;
      name: string;
      type: FieldType;
      memberAccess: MemberAccess;
      sortOrder: number;
    },
  ): Promise<void> {
    await db(FIELDS_TABLE).insert({
      id: new ObjectID().toHexString(),
      namespace: field.namespace,
      key: field.key,
      name: field.name,
      type: field.type,
      member_access: field.memberAccess,
      sort_order: field.sortOrder,
      created_at: new Date(),
    });
  }

  /**
   * The field as stored, whatever the reader, for a caller deciding about the stored row rather
   * than serving it: absent is an answer. Whether a field can take a value is asked through the
   * field source instead.
   */
  async find(
    field: FieldIdentity,
    { executor = this.knex }: { executor?: Knex } = {},
  ): Promise<Metafield | null> {
    const row = await executor(FIELDS_TABLE)
      .where({ namespace: field.namespace, key: field.key })
      .first();
    return row ? z.decode(metafieldCodec, row) : null;
  }

  /** The same entry `add` writes. Only the caller knows its transaction committed. */
  async recordCreated(context: RequestContext, fields: Metafield[]): Promise<void> {
    for (const field of fields) {
      await this.recordAction({
        context,
        verb: 'create',
        subject: field.id,
        details: { primary_name: field.name, key: field.key },
      });
    }
  }

  /**
   * Refuses adding `adding` fields to a namespace its limits leave no room in, counting every
   * field it holds, archived ones included.
   *
   * The count is a consistent read, not a locking one, so two creates landing at the same
   * instant can both pass and take a namespace one over. That is deliberate: holding a table
   * lock across every create to make it exact would cost more than the overshoot it prevents.
   */
  private async assertRoom(db: Knex, namespace: Namespace, adding: number): Promise<void> {
    const row = await db(FIELDS_TABLE).where({ namespace }).count({ count: '*' }).first();
    await this.namespaces.assertRoom(namespace, Number(row?.count ?? 0), adding);
  }

  /**
   * Set the order of the whole list, stated rather than adjusted: every row gets a
   * fresh rank, so a move is well-defined even where every rank is still the default.
   * Returns every definition, archived included, matching what the request named.
   */
  async reorder(
    context: RequestContext,
    namespace: Namespace,
    input: unknown,
  ): Promise<Metafield[]> {
    return this.tracking.definition('reorder', async () => {
      await this.namespaces.assertChangeable(namespace);
      const parsed = ReorderInput.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new errors.ValidationError({
          message: issue.message,
          property: propertyOf(issue.path),
        });
      }
      const keys = parsed.data.map((item) => item.key);

      const ordered = await this.knex.transaction(async (trx) => {
        await this.assertNamesEveryField(trx, namespace, keys);

        // Ranks come from the request's order; the statements go out in key order, so
        // two concurrent reorders take their row locks in the same sequence and
        // cannot deadlock. `updated_at` is left alone — the definitions did not
        // change, the list around them did.
        const ranked = keys
          .map((key, rank) => ({ key, rank }))
          .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        for (const { key, rank } of ranked) {
          await trx(FIELDS_TABLE).where({ namespace, key }).update({ sort_order: rank });
        }

        // An order covers the whole list, archived definitions included.
        return this.list(
          this.fields.definitions(trx, { audience: ADMIN, status: ANY_STATUS, namespace }),
        );
      });

      await this.recordAction({
        context,
        verb: 'reorder',
        subject: null,
        details: { action_name: 'reordered', count: ordered.length },
      });
      return ordered;
    });
  }

  /**
   * A partial order is ambiguous, so a reorder that does not name every field exactly
   * once is refused rather than half-applied. A client that loaded before a colleague
   * added a field cannot name it, and is told to reload.
   */
  private async assertNamesEveryField(db: Knex, namespace: Namespace, keys: Key[]): Promise<void> {
    const named = new Set(keys);
    const existing = new Set(
      await db(FIELDS_TABLE).where('namespace', namespace).pluck<string[]>('key'),
    );

    const matches =
      named.size === keys.length &&
      named.size === existing.size &&
      keys.every((key) => existing.has(key));

    if (!matches) {
      throw new errors.ValidationError({
        message: 'The order must name every custom field exactly once. Reload and try again.',
        property: 'key',
      });
    }
  }

  /** A new field is appended. Archived fields hold ranks too, so it lands past them. */
  private async nextSortOrder(db: Knex, namespace: Namespace): Promise<number> {
    const row = await db(FIELDS_TABLE)
      .where('namespace', namespace)
      .max({ highest: 'sort_order' })
      .first();
    const highest = row?.highest;
    // No fields yet, so this one starts the order.
    if (highest === null || highest === undefined) {
      return 0;
    }
    return Number(highest) + 1;
  }

  /** Read back a batch in the order its keys were created, not the table's order. */
  private async readMany(db: Knex, namespace: Namespace, keys: Key[]): Promise<Metafield[]> {
    const rows = await db(FIELDS_TABLE)
      .where('namespace', namespace)
      .whereIn('key', keys)
      .select('*');
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return keys.map((key) => {
      const row = byKey.get(key);
      if (!row) {
        throw new errors.InternalServerError({
          message: 'A custom field could not be read back after it was written.',
        });
      }
      return z.decode(metafieldCodec, row);
    });
  }

  /**
   * Pick a free key from the name's base: `base`, then `base_2`, `base_3`, ...
   * Reads the keys the namespace has already taken by that base, archived fields
   * included, so a key is never reused once minted.
   */
  private async mintKey(db: Knex, namespace: Namespace, base: Key): Promise<Key> {
    // Trimmed again after cutting, because the cut can land mid-separator and
    // a key that ends in one is not a shape minting is allowed to produce. The
    // base starts with an alphanumeric, so something always survives.
    const safeBase = base.slice(0, MAX_KEY_BASE_LENGTH).replace(/_+$/, '');
    const taken = new Set([
      ...RESERVED_KEYS,
      ...(await db(FIELDS_TABLE)
        .where('namespace', namespace)
        .where('key', 'like', `${safeBase}%`)
        .pluck('key')),
    ]);
    if (!taken.has(safeBase)) {
      return KeySchema.parse(safeBase);
    }
    for (let suffix = 2; suffix <= MAX_KEY_ITERATIONS; suffix += 1) {
      const candidate = `${safeBase}_${suffix}`;
      if (!taken.has(candidate)) {
        return KeySchema.parse(candidate);
      }
    }
    throw new errors.ValidationError({
      message: 'Could not mint a unique key for this custom field.',
      property: 'name',
    });
  }

  /**
   * Names are unique within a namespace (across active and archived) so the label
   * is never ambiguous in its list, and a unique index on namespace and `name` enforces
   * it. This read gives a clean `property: name` 422 for the common case (the raw index
   * violation can't be told apart from a key clash); the index is the race backstop.
   *
   * The LOWER() normalises case in application code because the engines
   * disagree: MySQL's default collation is case-insensitive, SQLite's is not,
   * so relying on the index alone would reject "Company"/"company" in prod but
   * allow it in the SQLite test/dev suites. `exceptKey` lets a field keep its
   * own name on an unrelated edit.
   */
  private async assertNameAvailable(
    db: Knex,
    namespace: Namespace,
    name: string,
    exceptKey?: Key,
  ): Promise<void> {
    const query = db(FIELDS_TABLE)
      .where('namespace', namespace)
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()]);
    if (exceptKey) {
      query.whereNot('key', exceptKey);
    }
    const clash = await query.first();
    if (clash) {
      throw new errors.ValidationError({
        message: 'A custom field with this name already exists.',
        property: 'name',
      });
    }
  }

  async edit(
    context: RequestContext,
    namespace: Namespace,
    key: Key,
    input: unknown,
  ): Promise<Metafield> {
    return this.tracking.definition('edit', async (attempt) => {
      await this.namespaces.assertChangeable(namespace);
      const parsed = EditFieldInput.safeParse(input);
      if (!parsed.success) {
        throw new errors.ValidationError({
          message: parsed.error.issues[0].message,
          property: parsed.error.issues[0].path[0]?.toString(),
        });
      }
      const patch = parsed.data;

      // As stored rather than through the field source, since the patch is compared with what
      // the write would change.
      const existing = await this.find({ namespace, key });
      if (!existing) {
        throw new errors.NotFoundError({ message: 'Custom field not found.' });
      }
      attempt.fields([existing]);

      // Key and type are immutable after creation: values are addressed by namespace and key
      // and interpreted by type, so changing either would silently orphan or
      // corrupt stored values. Reject a differing value rather than ignore it.
      if (patch.key !== undefined && patch.key !== existing.key) {
        throw new errors.ValidationError({
          message: 'Custom field keys cannot be changed once created.',
          property: 'key',
        });
      }
      if (patch.type !== undefined && patch.type !== existing.type) {
        throw new errors.ValidationError({
          message: 'Custom field types cannot be changed once created.',
          property: 'type',
        });
      }

      // Only write (and log a rename) when the name actually changes, so
      // re-saving an unchanged field is a no-op rather than a spurious edit.
      if (patch.name !== undefined && patch.name !== existing.name) {
        attempt.changing('rename');
        await this.assertNameAvailable(this.knex, namespace, patch.name, key);
        try {
          await this.knex(FIELDS_TABLE)
            .where({ namespace, key })
            .update({ name: patch.name, updated_at: new Date() });
        } catch (err) {
          if (isUniqueConstraintViolation(err)) {
            throw new errors.ConflictError({
              message: 'Could not rename the custom field, please try again.',
            });
          }
          throw err;
        }
        await this.recordAction({
          context,
          verb: 'rename',
          subject: existing.id,
          details: { primary_name: patch.name, key, previous_name: existing.name },
        });
      }

      if (patch.access !== undefined && patch.access.member !== existing.access.member) {
        attempt.changing('changeAccess');
        await this.knex(FIELDS_TABLE)
          .where({ namespace, key })
          .update({ member_access: patch.access.member, updated_at: new Date() });
        await this.recordAction({
          context,
          verb: 'changeAccess',
          subject: existing.id,
          details: {
            primary_name: patch.name ?? existing.name,
            key,
            member_access: patch.access.member,
            previous_member_access: existing.access.member,
          },
        });
      }

      // A status change is the archive/restore transition. Only write (and log)
      // when it actually flips, so re-sending the current status is a no-op.
      if (patch.status !== undefined && patch.status !== existing.status) {
        const verb = patch.status === FIELD_STATUS.archived ? 'archive' : 'restore';
        attempt.changing(verb);
        await this.knex(FIELDS_TABLE)
          .where({ namespace, key })
          .update({ status: patch.status, updated_at: new Date() });
        await this.recordAction({
          context,
          verb,
          subject: existing.id,
          details: { primary_name: patch.name ?? existing.name, key },
        });
      }

      return this.read(namespace, key, ADMIN);
    });
  }

  /**
   * Permanently delete a field and every member value attached to it (the FK
   * cascades the values). Destructive and irreversible, so it's gated on the
   * field already being archived: a publisher must archive first, then delete,
   * which makes accidental data loss a deliberate two-step. Archiving is the
   * reversible soft state (see `edit` with a status change).
   */
  async destroy(context: RequestContext, namespace: Namespace, key: Key): Promise<void> {
    return this.tracking.definition('delete', async (attempt) => {
      await this.namespaces.assertChangeable(namespace);
      const field = await this.knex(FIELDS_TABLE).where({ namespace, key }).first();
      if (!field) {
        throw new errors.NotFoundError({ message: 'Custom field not found.' });
      }
      attempt.fields([field]);
      if (field.status !== FIELD_STATUS.archived) {
        throw new errors.ValidationError({
          message: 'Only archived custom fields can be deleted. Archive the field first.',
        });
      }
      await this.knex(FIELDS_TABLE).where({ namespace, key }).del();
      await this.recordAction({
        context,
        verb: 'delete',
        subject: field.id,
        details: { primary_name: field.name, key },
      });
    });
  }
}

/**
 * A stated key, checked: made of the characters every key is, no longer than its column, and
 * not a name every object already has. Minting derives keys that are all three by
 * construction; a caller stating its own has said nothing about any of them.
 *
 * The length bound is the column's own, not `mintKey`'s: that one holds back room for a
 * `_<n>` collision suffix, and a stated key is written exactly as given and never
 * suffixed, so the whole column is available to it.
 */
function usableKey(stated: string): Key {
  const key = parseRequest(KeySchema, stated, 'key');
  if (key.length > MAX_KEY_LENGTH) {
    throw new errors.ValidationError({
      message: `A custom field key can be at most ${MAX_KEY_LENGTH} characters.`,
      property: 'key',
    });
  }
  if (RESERVED_KEYS.includes(key)) {
    throw new errors.ValidationError({
      message: `${key} cannot be used as a custom field key.`,
      property: 'key',
    });
  }
  return key;
}

// The field a zod issue points at. Create validates an array, so an issue's path
// is prefixed with the item's index (`[0, 'name']`); `property` names the field
// that is wrong, so the numeric prefix is dropped. Which item it was is reported
// separately by batchContext, keeping `property` the bare field name a client can
// map straight onto its form input.
function propertyOf(path: PropertyKey[]): string | undefined {
  return path.find((segment) => typeof segment === 'string');
}

// Which definition of a batch an error belongs to. Only set when the request
// carried more than one: a lone definition needs no pointer, and every client
// today sends exactly one, so this stays absent on the common path.
function batchContext(index: PropertyKey | undefined, requestedCount: number): string | undefined {
  if (requestedCount <= 1 || typeof index !== 'number') {
    return undefined;
  }
  return `Custom field ${index + 1} of ${requestedCount}.`;
}

const DriverError = z.object({ code: z.string() });

function isUniqueConstraintViolation(error: unknown): boolean {
  const code = DriverError.safeParse(error).data?.code;
  return code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT';
}

const MongoQuery = z.record(z.string(), z.unknown());

// Parse a caller-supplied NQL filter, without applying it. A malformed filter is a
// client error (400), not a 500. Whether the result widens the statuses is decided by
// the caller, which reads it with `filterReferencesStatus` and says so when building
// the query; nothing here narrows anything.
function parseFilter(filter: string): Record<string, unknown> {
  let mongoQuery: Record<string, unknown>;
  try {
    mongoQuery = MongoQuery.parse(nql(filter).toJSON());
  } catch (err) {
    throw new errors.BadRequestError({
      message: 'Could not parse the filter parameter.',
      property: 'filter',
      err: err instanceof Error ? err : undefined,
    });
  }
  return mongoQuery;
}

// Whether an NQL-parsed filter constrains `status` anywhere, including inside the
// $and/$or/$nor combinators — so a status filter at any nesting counts as the
// caller opting in to (or out of) archived fields.
function filterReferencesStatus(query: Record<string, unknown>): boolean {
  return filterReferencesAttribute(query, 'status');
}

function filterReferencesAttribute(query: Record<string, unknown>, attribute: string): boolean {
  return Object.entries(query).some(([key, value]) => {
    if (key === attribute) {
      return true;
    }
    if ((key === '$and' || key === '$or' || key === '$nor') && Array.isArray(value)) {
      return value.some((sub) => {
        const clause = MongoQuery.safeParse(sub);
        return clause.success && filterReferencesAttribute(clause.data, attribute);
      });
    }
    return false;
  });
}
