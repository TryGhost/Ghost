import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import { MemberAccessSchema } from '@tryghost/metafield-types';
import schema from '../../../schema/schema';
import * as metafields from '../../../../services/members-metafields';
import type { Definition } from '../../../../services/members-metafields';
import {
  FIELD_STATUS,
  FieldStatusSchema,
  storedField,
} from '../../../../services/members-metafields/metafields/schema';

// Imports a site's custom fields: the definitions of the fields its members hold values in. The
// values travel in the members CSV, which names each field by its key, as segments' filters and
// the checkout settings do, so every field is added under the key it had. Each is added through
// the custom fields service, so an imported field follows the rules, and the host's limits, that
// any new field does.

/**
 * A `members_metafields` row as an export holds it. Its settings are read for their shape alone,
 * as they are read from the table, and are checked against the rules when the field is added.
 */
const ExportedField = storedField({
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  status: FieldStatusSchema,
  member_access: MemberAccessSchema,
  sort_order: z.number(),
  created_at: z.string(),
}).asStored;
type ExportedField = z.output<typeof ExportedField>;

const ExportData = z.object({ members_metafields: z.array(z.unknown()).catch([]) });

/**
 * The name a field is imported under: `name` itself for the number 1, and otherwise `name` with
 * the number added, such as "Company (2)". Either is cut to fit the fields table, counting the
 * length as the custom fields service checks it, without splitting a character.
 */
function numbered(name: string, number: number, maxLength: number): string {
  const suffix = number === 1 ? '' : ` (${number})`;
  let cut = '';
  for (const character of name.trim()) {
    if (cut.length + character.length > maxLength - suffix.length) {
      break;
    }
    cut += character;
  }
  return cut + suffix;
}

interface ImportProblem {
  message: string;
  help: string;
  context: string;
}

/**
 * The step of a data import that adds the file's custom fields. It has the shape the data
 * importer drives every step through.
 */
export class CustomFieldsImporter {
  readonly dataKeyToImport = 'members_metafields';
  readonly options = { requiredImportedData: [], requiredExistingData: [] };
  readonly requiredImportedData = {};
  readonly requiredExistingData = {};
  readonly problems: ImportProblem[] = [];
  readonly errors: unknown[] = [];
  readonly importedData: Definition[] = [];
  readonly importedDataToReturn: Definition[] = [];

  /** The rows of the file, which are read as fields once the import runs. */
  private readonly rows: unknown[];

  constructor(allDataFromFile: unknown) {
    this.rows = ExportData.safeParse(allDataFromFile).data?.members_metafields ?? [];
  }

  async fetchExisting(): Promise<void> {}

  async beforeImport(): Promise<void> {}

  async replaceIdentifiers(): Promise<void> {}

  /**
   * Adds each custom field in the file, in the order the file's site listed them, after the
   * site's own fields, in the import's transaction.
   *
   * A field the site already has a field under the key of is not added again, so a file can be
   * imported twice. A field whose name the site gives a field under another key is added with a
   * number, such as "Company (2)", because nobody can be asked for another name during an import
   * and the key is what everything else names it by. A field that can't be one, such as a list
   * with no options, or one the site can't hold, such as on a plan without custom fields, is left
   * out, and the problems say why.
   */
  async doImport({ transacting }: { transacting: Knex.Transaction }): Promise<void> {
    const fields = this.readFields();
    if (fields.length === 0) {
      return;
    }
    const { definitions } = metafields.booted();
    const maxNameLength = schema.members_metafields.name.maxlength;
    const stored = await definitions.browse(
      { namespace: CUSTOM_NAMESPACE, filter: `status:[${Object.values(FIELD_STATUS).join(',')}]` },
      { kind: 'internal' },
      transacting,
    );
    const keys = new Set<string>(stored.map(({ key }) => key));
    const context = { actor: null };
    /**
     * Whether a field has `name`, compared as the custom fields service compares names, and so
     * by the database's collation, which can count names as the same that differ by an accent.
     */
    const isNameTaken = async (name: string): Promise<boolean> =>
      (await transacting('members_metafields')
        .where('namespace', CUSTOM_NAMESPACE)
        .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
        .first('id')) !== undefined;

    for (const field of fields) {
      if (keys.has(field.key)) {
        this.skipped(field, 'Custom field was not imported because the site already has it.');
        continue;
      }
      let number = 1;
      while (await isNameTaken(numbered(field.name, number, maxNameLength))) {
        number += 1;
      }
      let added: Definition;
      try {
        [added] = await definitions.add(
          context,
          CUSTOM_NAMESPACE,
          [
            {
              name: numbered(field.name, number, maxNameLength),
              key: field.key,
              type: field.type,
              settings: field.settings,
              access: { member: field.member_access },
            },
          ],
          transacting,
        );
      } catch (err) {
        // A refused add has written nothing, so the import goes on without the field.
        if (
          !(err instanceof errors.ValidationError) &&
          !(err instanceof errors.HostLimitError) &&
          !(err instanceof errors.ConflictError)
        ) {
          throw err;
        }
        this.skipped(field, `Custom field was not imported: ${err.message}`);
        continue;
      }
      // Fields are added as active, so an archived one is archived once it's added.
      const imported =
        field.status === FIELD_STATUS.archived
          ? (
              await definitions.edit(
                context,
                CUSTOM_NAMESPACE,
                added.key,
                { status: FIELD_STATUS.archived },
                transacting,
              )
            ).next
          : added;
      keys.add(imported.key);
      this.importedData.push(imported);
      this.importedDataToReturn.push(imported);
    }
  }

  /**
   * The file's custom fields, in their site's order. Only custom fields are read: a field
   * another namespace holds belongs to whatever declared it, which adds its own fields. A row
   * that can't be read as a field is left out, and the problems say so.
   */
  private readFields(): ExportedField[] {
    const fields: ExportedField[] = [];
    for (const row of this.rows) {
      const field = ExportedField.safeParse(row);
      if (!field.success) {
        this.problems.push({
          message: 'Custom field was not imported because it could not be read.',
          help: 'Custom field',
          context: JSON.stringify(row),
        });
      } else if (field.data.namespace === CUSTOM_NAMESPACE) {
        fields.push(field.data);
      }
    }
    return fields.sort(
      (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
    );
  }

  private skipped(field: ExportedField, message: string): void {
    this.problems.push({
      message,
      help: 'Custom field',
      context: JSON.stringify({ key: field.key, name: field.name }),
    });
  }
}
