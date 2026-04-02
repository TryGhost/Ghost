import {FilterOption} from '@tryghost/shade/patterns';
import {escapeNqlString} from '@src/views/filters/filter-normalization';

export function buildQuotedListFilter(key: string, values: string[]): string | undefined {
    if (values.length === 0) {
        return undefined;
    }

    return `${key}:[${values.map(value => escapeNqlString(value)).join(',')}]`;
}

export function filterOptionsByQuery<T = string>(options: FilterOption<T>[], query: string): FilterOption<T>[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return options;
    }

    return options.filter((option) => {
        return option.label.toLowerCase().includes(normalizedQuery) ||
            option.detail?.toLowerCase().includes(normalizedQuery);
    });
}

export function mergeFilterOptions<T = string>(...lists: Array<Array<FilterOption<T>> | undefined>): FilterOption<T>[] {
    const merged = new Map<T, FilterOption<T>>();

    for (const list of lists) {
        if (!list) {
            continue;
        }

        for (const option of list) {
            if (!merged.has(option.value)) {
                merged.set(option.value, option);
            }
        }
    }

    return [...merged.values()];
}
