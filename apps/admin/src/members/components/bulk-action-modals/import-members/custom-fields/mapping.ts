import {FIELD_MAPPINGS, IMPORT_TIER_FIELD_MAPPING} from '@/members/components/bulk-action-modals/import-members/mapping';
import {isCustomFieldColumn} from '@tryghost/admin-x-framework/api/member-custom-fields';

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
export {MembersFieldMapping, columnsOf, detectFieldTypes, formatImportError, sampleData} from '@/members/components/bulk-action-modals/import-members/mapping';

// The native targets only. Custom fields are offered from their own list, chosen by kind, so
// they are not folded in here — auto-detection still sees both, through the shared detection.
export function getFieldMappings({importMemberTier = false}: {importMemberTier?: boolean} = {}) {
    return [
        ...FIELD_MAPPINGS,
        ...(importMemberTier ? [IMPORT_TIER_FIELD_MAPPING] : [])
    ];
}

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
    // A custom field column is `custom_fields.<key>` or `custom_fields.<key>.<part>`. The name
    // being suggested is the field's, so the part is dropped: `custom_fields.home-address.city`
    // names a field called "Home address" whose City part this column holds, and the part is
    // asked for separately. A bare `custom_fields` column has no key, so it suggests the namespace itself.
    const segments = isCustomFieldColumn(column) ? column.split('.').slice(1, 2) : [column];
    const words = (segments[0] ?? column).replace(/[._-]+/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}
