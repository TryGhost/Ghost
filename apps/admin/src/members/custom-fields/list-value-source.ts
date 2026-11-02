import { filterOptionsByQuery } from '@/shared/filter-sources';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { FieldOfShape } from '@tryghost/metafield-types/structure';
import type { FilterOption, ValueSource } from '@tryghost/shade/patterns';

const NOOP = () => {};

/**
 * The options a list field's filter offers, each shown as its text: the field's own options in the
 * field's order, then any options already picked, so a saved filter still shows every option it
 * names.
 */
export function listFieldValueSource(
  field: FieldOfShape<'set', MemberCustomField>,
): ValueSource<string> {
  return {
    id: `metafields.${field.namespace}.${field.key}`,
    useOptions({ query, selectedValues }) {
      const options: FilterOption<string>[] = [
        ...new Set([...field.settings.options, ...selectedValues]),
      ].map((option) => ({ value: option, label: option }));

      return {
        options: filterOptionsByQuery(options, query),
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: NOOP,
      };
    },
  };
}
