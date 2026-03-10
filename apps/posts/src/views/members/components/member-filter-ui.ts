import type {Filter, FilterFieldConfig, FilterFieldGroup} from '@tryghost/shade';

const DUPLICATE_CAPABLE_FIELD_TYPES = new Set(['text', 'date', 'number']);

export interface MemberFilterUiState {
    displayGroups: FilterFieldGroup[];
    displayFilters: Filter[];
    fieldKeyMap: Map<string, string>;
}

function buildRowFieldKey(fieldKey: string, filterId: string): string {
    return `${fieldKey}__row__${filterId}`;
}

function isDuplicateCapableField(field: FilterFieldConfig): boolean {
    return DUPLICATE_CAPABLE_FIELD_TYPES.has(field.type);
}

function cloneFieldWithKey(field: FilterFieldConfig, key: string): FilterFieldConfig {
    return {
        ...field,
        key
    };
}

export function buildMemberFilterUiState({fieldGroups, filters}: {fieldGroups: FilterFieldGroup[]; filters: Filter[]}): MemberFilterUiState {
    const fieldKeyMap = new Map<string, string>();
    const displayFieldKeysByFilterId = new Map<string, string>();

    const displayGroups = fieldGroups.map((group) => {
        const fields = group.fields.flatMap((field) => {
            const matchingFilters = filters.filter(filter => filter.field === field.key);

            if (matchingFilters.length === 0) {
                fieldKeyMap.set(field.key, field.key);
                return [field];
            }

            const activeFields = matchingFilters.map((filter) => {
                const rowFieldKey = buildRowFieldKey(field.key, filter.id || `${field.key}-row`);
                displayFieldKeysByFilterId.set(filter.id || rowFieldKey, rowFieldKey);
                fieldKeyMap.set(rowFieldKey, field.key);

                return cloneFieldWithKey(field, rowFieldKey);
            });

            if (isDuplicateCapableField(field)) {
                fieldKeyMap.set(field.key, field.key);
                return [...activeFields, field];
            }

            return activeFields;
        });

        return {
            ...group,
            fields
        };
    });

    const displayFilters = filters.map((filter) => {
        const displayFieldKey = displayFieldKeysByFilterId.get(filter.id || '');

        if (!displayFieldKey) {
            return filter;
        }

        return {
            ...filter,
            field: displayFieldKey
        };
    });

    return {
        displayGroups,
        displayFilters,
        fieldKeyMap
    };
}

export function restoreMemberFiltersFromUi(filters: Filter[], fieldKeyMap: Map<string, string>): Filter[] {
    return filters.map(filter => ({
        ...filter,
        field: fieldKeyMap.get(filter.field) || filter.field
    }));
}
