import { isDeepStrictEqual } from 'node:util';
import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import { Metafield } from './models';
import {
  FieldTypeSchema,
  TypedSettingsInputSchema,
  WRITTEN_SETTINGS,
  isCreatableType,
  refusedProperty,
  withTypedSettings,
  type FieldType,
  type TypedSettings,
} from '@tryghost/metafield-types';
import { metafieldCodec, metafieldCodecWithDefaults } from './codec';
import { readStoredField } from './stored-fields';
import { type Key, KeySchema, type Namespace } from '@tryghost/metafield-types/identity';
import type { Namespaces } from './namespaces';
import { DbTypedSettings, FIELD_STATUS, FieldStatusSchema } from './schema';
import {
  ADMIN,
  MEMBERS,
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
import { type RecordMetafieldAction, type RequestContext } from './actions';
import type { MetafieldsTracking } from './tracking';
import { ensureTransaction } from '../../lib/ensure-transaction';

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

// No key: the backend mints it from the name. The type is checked with the settings it takes.

const AddFieldInput = withTypedSettings(
  { name: FieldName, access: FieldAccess.optional() },
  WRITTEN_SETTINGS,
);

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

// Name, settings, status and access are mutable. `key` and `type` are accepted so the
// immutability rules can reject a change loudly; they are never persisted. Settings are checked
// against the field's type once the field is read.
const EditFieldInput = z.object({
  name: FieldName.optional(),
  settings: z.unknown().optional(),
  status: FieldStatusSchema.optional(),
  access: FieldAccess.optional(),
  key: z.optional(KeySchema),
  type: FieldTypeSchema.optional(),
});

/** A field as an edit left it. */
export interface EditedField {
  field: Metafield;
  /**
   * Whether the edit started or stopped members reading the field: archiving or restoring it, or
   * keeping it from members or opening it to them.
   */
  changedForMembers: boolean;
}

export class MetafieldDefinitionsService {
  private knex: Knex;
  private fields: FieldSource;
  private recordAction: RecordMetafieldAction;
  private namespaces: Namespaces;
  private tracking: MetafieldsTracking;
  private labs: { isSet(flag: string): boolean };

  constructor({
    knex,
    fields,
    recordAction,
    namespaces,
    tracking,
    labs,
  }: {
    knex: Knex;
    fields: FieldSource;
    recordAction: RecordMetafieldAction;
    namespaces: Namespaces;
    tracking: MetafieldsTracking;
    /** Asked on every create, as a type's flag can be switched on while Ghost runs. */
    labs: { isSet(flag: string): boolean };
  }) {
    this.knex = knex;
    this.fields = fields;
    this.recordAction = recordAction;
    this.namespaces = namespaces;
    this.tracking = tracking;
    this.labs = labs;
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
    return rows.flatMap((row) => this.readField(row) ?? []);
  }

  /** A stored definition, or null for one that can't be read even with its type's defaults. */
  private readField(row: Readonly<Record<string, unknown>>): Metafield | null {
    return readStoredField(
      row,
      { asStored: metafieldCodec, withDefaults: metafieldCodecWithDefaults },
      { reader: 'definitions', tracking: this.tracking },
    );
  }

  async read(namespace: Namespace, key: Key, audience: Audience): Promise<Metafield> {
    return this.readOn(this.knex, namespace, key, audience);
  }

  private async readOn(
    db: Knex,
    namespace: Namespace,
    key: Key,
    audience: Audience,
  ): Promise<Metafield> {
    const [field] = await this.list(
      this.fields.definitions(db, {
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
   *
   * Given a transaction as `executor` it joins that transaction; given a plain connection it
   * opens its own.
   */
  async add(
    context: RequestContext,
    namespace: Namespace,
    input: unknown,
    executor: Knex = this.knex,
  ): Promise<Metafield[]> {
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

      fields.forEach((field, index) => {
        this.assertCreatable(field.type, batchContext(index, requestedCount));
      });

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
        created = await ensureTransaction(executor, async (trx) => {
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
              typed: field,
              memberAccess: field.access?.member ?? MEMBER_ACCESS.none,
              sortOrder: firstSortOrder + index,
            });
            keys.push(key);
          }
          const added = await this.readMany(trx, namespace, keys);
          await this.record(
            trx,
            added.map((field) => ({
              context,
              verb: 'create',
              subject: field.id,
              details: { primary_name: field.name, key: field.key },
            })),
          );
          return added;
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

      return created;
    });
  }

  /**
   * Refuses a type this site doesn't offer yet: one still in development, whose Labs flag is
   * off here. Asked of every create, whoever makes it, so the API refuses what Admin doesn't
   * offer.
   */
  private assertCreatable(type: FieldType, context?: string): void {
    if (!isCreatableType(type, (flag) => this.labs.isSet(flag))) {
      throw new errors.ValidationError({
        message: `Custom fields of the type ${type} are not available on this site.`,
        property: 'type',
        context,
      });
    }
  }

  private async insertField(
    db: Knex,
    field: {
      namespace: Namespace;
      key: Key;
      name: string;
      typed: TypedSettings;
      memberAccess: MemberAccess;
      sortOrder: number;
    },
  ): Promise<void> {
    await db(FIELDS_TABLE).insert({
      id: new ObjectID().toHexString(),
      namespace: field.namespace,
      key: field.key,
      name: field.name,
      ...z.encode(DbTypedSettings, field.typed),
      member_access: field.memberAccess,
      sort_order: field.sortOrder,
      created_at: new Date(),
    });
  }

  /**
   * Writes the staff history entries for a command, inside the command's transaction, so they are
   * saved when the change is saved and never without it.
   */
  private async record(
    trx: Knex.Transaction,
    actions: Array<Parameters<RecordMetafieldAction>[1]>,
  ): Promise<void> {
    for (const action of actions) {
      await this.recordAction(trx, action);
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
   *
   * Given a transaction as `executor` it joins that transaction; given a plain connection it
   * opens its own.
   */
  async reorder(
    context: RequestContext,
    namespace: Namespace,
    input: unknown,
    executor: Knex = this.knex,
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

      return ensureTransaction(executor, async (trx) => {
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
        const ordered = await this.list(
          this.fields.definitions(trx, { audience: ADMIN, status: ANY_STATUS, namespace }),
        );
        await this.record(trx, [
          {
            context,
            verb: 'reorder',
            subject: null,
            details: { action_name: 'reordered', count: ordered.length },
          },
        ]);
        return ordered;
      });
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
      const field = row ? this.readField(row) : null;
      if (!field) {
        throw new errors.InternalServerError({
          message: 'A custom field could not be read back after it was written.',
        });
      }
      return field;
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
    executor: Knex = this.knex,
  ): Promise<EditedField> {
    return this.tracking.definition('edit', async (attempt) => {
      await this.namespaces.assertChangeable(namespace);
      const parsed = EditFieldInput.safeParse(input);
      if (!parsed.success) {
        throw new errors.ValidationError({
          message: parsed.error.issues[0].message,
          property: propertyOf(parsed.error.issues[0].path),
        });
      }
      const patch = parsed.data;

      return ensureTransaction(executor, async (trx) => {
        const existing = await this.lockedField(trx, { namespace, key });
        if (!existing) {
          throw new errors.NotFoundError({ message: 'Custom field not found.' });
        }
        attempt.fields([existing]);
        const readByMembers = await this.isReadByMembers(trx, { namespace, key });

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

        const settings =
          patch.settings === undefined
            ? undefined
            : TypedSettingsInputSchema.safeParse({ type: existing.type, settings: patch.settings });
        if (settings && !settings.success) {
          throw new errors.ValidationError({
            message: settings.error.issues[0].message,
            property: propertyOf(settings.error.issues[0].path),
          });
        }

        // Only what actually changes is written and logged, so re-saving an unchanged field is a
        // no-op rather than a spurious edit.
        const recorded: Array<Parameters<RecordMetafieldAction>[1]> = [];
        const name = patch.name ?? existing.name;

        if (patch.name !== undefined && patch.name !== existing.name) {
          attempt.changing('rename');
          await this.assertNameAvailable(trx, namespace, patch.name, key);
          try {
            await trx(FIELDS_TABLE)
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
          recorded.push({
            context,
            verb: 'rename',
            subject: existing.id,
            details: { primary_name: patch.name, key, previous_name: existing.name },
          });
        }

        if (settings && !isDeepStrictEqual(settings.data.settings, existing.settings)) {
          attempt.changing('changeSettings');
          await trx(FIELDS_TABLE)
            .where({ namespace, key })
            .update({ ...z.encode(DbTypedSettings, settings.data), updated_at: new Date() });
          recorded.push({
            context,
            verb: 'changeSettings',
            subject: existing.id,
            details: { primary_name: name, key },
          });
        }

        if (patch.access !== undefined && patch.access.member !== existing.access.member) {
          attempt.changing('changeAccess');
          await trx(FIELDS_TABLE)
            .where({ namespace, key })
            .update({ member_access: patch.access.member, updated_at: new Date() });
          recorded.push({
            context,
            verb: 'changeAccess',
            subject: existing.id,
            details: {
              primary_name: name,
              key,
              member_access: patch.access.member,
              previous_member_access: existing.access.member,
            },
          });
        }

        // A status change is the archive/restore transition.
        if (patch.status !== undefined && patch.status !== existing.status) {
          const verb = patch.status === FIELD_STATUS.archived ? 'archive' : 'restore';
          attempt.changing(verb);
          await trx(FIELDS_TABLE)
            .where({ namespace, key })
            .update({ status: patch.status, updated_at: new Date() });
          recorded.push({
            context,
            verb,
            subject: existing.id,
            details: { primary_name: name, key },
          });
        }

        await this.record(trx, recorded);
        return {
          field: await this.readOn(trx, namespace, key, ADMIN),
          changedForMembers:
            (await this.isReadByMembers(trx, { namespace, key })) !== readByMembers,
        };
      });
    });
  }

  /**
   * The field as stored, with its row locked until `trx` ends, so two edits of one field take
   * turns and each is compared with what the other saved. Returns null for a field that does not
   * exist, or one that cannot be read even with its type's defaults.
   */
  private async lockedField(
    trx: Knex.Transaction,
    field: FieldIdentity,
  ): Promise<Metafield | null> {
    const row = await trx(FIELDS_TABLE)
      .where({ namespace: field.namespace, key: field.key })
      .forUpdate()
      .first();
    return row ? this.readField(row) : null;
  }

  /** Whether members can read this field, asked the way their own reads ask. */
  private async isReadByMembers(db: Knex, field: FieldIdentity): Promise<boolean> {
    const read = this.fields.definitions(db, {
      audience: MEMBERS,
      status: ACTIVE_ONLY,
      field,
    }).read;
    return (await read.first('key')) !== undefined;
  }

  /**
   * Permanently delete a field and every member value attached to it (the FK
   * cascades the values). Destructive and irreversible, so it's gated on the
   * field already being archived: a publisher must archive first, then delete,
   * which makes accidental data loss a deliberate two-step. Archiving is the
   * reversible soft state (see `edit` with a status change).
   */
  async destroy(
    context: RequestContext,
    namespace: Namespace,
    key: Key,
    executor: Knex = this.knex,
  ): Promise<void> {
    return this.tracking.definition('delete', async (attempt) => {
      await this.namespaces.assertChangeable(namespace);
      await ensureTransaction(executor, async (trx) => {
        // Locked, so a restore that lands between this check and the delete waits, rather than
        // having the field it just restored deleted.
        const stored = await trx(FIELDS_TABLE).where({ namespace, key }).forUpdate().first();
        if (!stored) {
          throw new errors.NotFoundError({ message: 'Custom field not found.' });
        }
        attempt.fields([stored]);
        if (stored.status !== FIELD_STATUS.archived) {
          throw new errors.ValidationError({
            message: 'Only archived custom fields can be deleted. Archive the field first.',
          });
        }
        await trx(FIELDS_TABLE).where({ namespace, key }).del();
        await this.record(trx, [
          {
            context,
            verb: 'delete',
            subject: stored.id,
            details: { primary_name: stored.name, key },
          },
        ]);
      });
    });
  }
}

// What a zod issue points at within one field, by its path, such as `name` or
// `settings.options.2`, so a client can show it beside the input that set the value.
// Create validates an array, so an issue's path is prefixed with the item's index
// (`[0, 'name']`), which is dropped: which item it was is reported separately by
// batchContext. An issue with the batch as a whole points at nothing.
function propertyOf(path: PropertyKey[]): string | undefined {
  const withinField = typeof path[0] === 'number' ? path.slice(1) : path;
  return withinField.length > 0 ? refusedProperty(withinField) : undefined;
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
