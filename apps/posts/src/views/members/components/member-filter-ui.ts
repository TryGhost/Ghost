import type {Filter, FilterFieldConfig, FilterFieldGroup} from '@tryghost/shade';

const DUPLICATE_CAPABLE_FIELD_TYPES = new Set(['text', 'date', 'number']);

type MemberFilterUiField = FilterFieldConfig & {
    allowDuplicate?: boolean;
};

export interface MemberFilterUiState {
    displayGroups: FilterFieldGroup[];
    displayFilters: Filter[];
    fieldKeyMap: Map<string, string>;
}

function buildRowFieldKey(fieldKey: string, filterId: string): string {
    return `${fieldKey}__row__${filterId}`;
}

function getFieldKey(field: FilterFieldConfig): string | undefined {
    return typeof field.key === 'string' && field.key.length > 0 ? field.key : undefined;
}

function isDuplicateCapableField(field: FilterFieldConfig): boolean {
    const memberField = field as MemberFilterUiField;

    if (memberField.allowDuplicate) {
        return true;
    }

    return typeof field.type === 'string' && DUPLICATE_CAPABLE_FIELD_TYPES.has(field.type);
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
            const fieldKey = getFieldKey(field);

            if (!fieldKey) {
                return [field];
            }

            const matchingFilters = filters.filter(filter => filter.field === fieldKey);

            if (matchingFilters.length === 0) {
                fieldKeyMap.set(fieldKey, fieldKey);
                return [field];
            }

            const activeFields = matchingFilters.map((filter) => {
                const rowFieldKey = buildRowFieldKey(fieldKey, filter.id || `${fieldKey}-row`);
                displayFieldKeysByFilterId.set(filter.id || rowFieldKey, rowFieldKey);
                fieldKeyMap.set(rowFieldKey, fieldKey);

                return cloneFieldWithKey(field, rowFieldKey);
            });

            if (isDuplicateCapableField(field)) {
                fieldKeyMap.set(fieldKey, fieldKey);
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
