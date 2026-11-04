import {
  type MemberCustomField,
  useMemberCustomFieldHeldValues,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { filterOptionsByQuery } from '@/shared/filter-sources';
import type { FieldOfShape } from '@tryghost/metafield-types/structure';
import type { FilterOption, ValueSource } from '@tryghost/shade/patterns';

const NOOP = () => {};

/**
 * The options a list field's filter offers, each shown as its text: the field's own options in the
 * field's order, then options members hold that the field no longer offers, then any options
 * already picked, so a saved filter still shows every option it names. What members hold is asked
 * for only once the filter shows the field.
 */
export function listFieldValueSource(
  field: FieldOfShape<'set', MemberCustomField>,
): ValueSource<string> {
  return {
    id: `metafields.${field.namespace}.${field.key}`,
    useOptions({ query, selectedValues }) {
      const { data, isLoading } = useMemberCustomFieldHeldValues(field);
      const held = data?.values.map((entry) => entry.value) ?? [];
      const options: FilterOption<string>[] = [
        ...new Set([...field.settings.options, ...held, ...selectedValues]),
      ].map((option) => ({ value: option, label: option }));

      return {
        options: filterOptionsByQuery(options, query),
        // Only a list read with its type's defaults has no options of its own to show meanwhile.
        isInitialLoad: isLoading && options.length === 0,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: NOOP,
      };
    },
  };
}
