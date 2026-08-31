import { isCustomFieldColumn } from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * What this modal adds to the shipped mapping vocabulary, and nothing it already says.
 *
 * Column detection, sampling, the mapping class and the error wording are the same questions
 * with the same answers on both sides of the flag, so they are re-exported rather than copied:
 * a fix to one is a fix to both, and there is no version of them that can drift.
 *
 * The class in particular has to come from there rather than be redeclared — it carries a
 * private field, so a second declaration is a distinct type to TypeScript however identical
 * its shape, and this modal could not hand its own mapping to the reducer it shares.
 */
export {
  MembersFieldMapping,
  columnsOf,
  detectFieldTypes,
  formatImportError,
  getFieldMappings,
  sampleData,
} from '@/members/components/bulk-action-modals/import-members/mapping';

/**
 * The field name to suggest for a column no defined field matches.
 *
 * A namespaced column comes from a Ghost export, so it carries a namespace that is noise
 * to a publisher and a key that was machine-minted from a name in the first place: both
 * are stripped back towards what someone would have typed. A column from anywhere else is
 * already the publisher's own wording, so only its separators and first letter are
 * touched. It is a starting point either way, and the form lets them edit it.
 */
export function suggestedFieldName(column: string): string {
  // A custom field column is `metafields.custom.<key>` or `metafields.custom.<key>.<part>`
  // — the qualifier, the namespace, then the key. The name being suggested is the
  // field's, so the part is dropped: `metafields.custom.home_address.city` names a field
  // called "Home address" whose City part this column holds, and the part is asked for
  // separately. Legacy `custom_fields.<key>` columns from old exports carry the key one
  // segment earlier, so the key is whatever follows the recognised prefix.
  const segments = column.split('.');
  const key = isCustomFieldColumn(column)
    ? segments[0] === 'metafields'
      ? segments[2]
      : segments[1]
    : column;
  const words = (key ?? column).replace(/[._-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
