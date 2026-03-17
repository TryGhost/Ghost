import {commentFields} from './comment-fields';
import {serializePredicates} from '../filters/filter-query-core';
import type {Filter} from '@tryghost/shade';

export function compileCommentFilters(filters: Filter[], timezone: string): string | undefined {
    return serializePredicates(filters, commentFields, timezone);
}
