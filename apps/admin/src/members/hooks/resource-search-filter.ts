import {escapeNqlString} from '@/shared/filters';

export function buildResourceFilter(baseFilter: string, search: string): string {
    if (!search) {
        return baseFilter;
    }

    return `${baseFilter}+title:~${escapeNqlString(search)}`;
}
