import {escapeNqlString} from '../../filters/filter-normalization';

export function buildResourceFilter(baseFilter: string, search: string): string {
    if (!search) {
        return baseFilter;
    }

    return `${baseFilter}+title:~${escapeNqlString(search)}`;
}
