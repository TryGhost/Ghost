import moment from 'moment-timezone';
import {commentFields} from './comment-fields';
import {getDayBoundsInUtc} from '../filters/filter-normalization';
import {importSimpleLegacyNodes, parseLegacyFilterToAst, stampImportedFilters} from '../filters/legacy-filter-import';
import type {AstNode} from '../filters/filter-ast';
import type {Filter} from '@tryghost/shade';
import type {UnstampedFilter} from '../filters/filter-types';

interface ExactDateMatchResult {
    filter: UnstampedFilter | null;
    remainingChildren: AstNode[];
}

function extractCreatedAtComparator(node: AstNode): {operator: string; value: string} | null {
    const createdAt = node.created_at;

    if (!createdAt || typeof createdAt !== 'object' || Array.isArray(createdAt)) {
        return null;
    }

    const [operator, value] = Object.entries(createdAt as Record<string, unknown>)[0] ?? [];

    if (!operator || typeof value !== 'string') {
        return null;
    }

    return {operator, value};
}

function matchExactDateCompound(children: AstNode[], timezone: string): ExactDateMatchResult {
    for (let index = 0; index < children.length; index += 1) {
        const lowerBound = extractCreatedAtComparator(children[index]);

        if (!lowerBound || lowerBound.operator !== '$gte') {
            continue;
        }

        const parsed = moment.tz(lowerBound.value, moment.ISO_8601, true, timezone);

        if (!parsed.isValid()) {
            continue;
        }

        const date = parsed.format('YYYY-MM-DD');
        const {start, end} = getDayBoundsInUtc(date, timezone);

        if (lowerBound.value !== start) {
            continue;
        }

        const upperBoundIndex = children.findIndex((child, candidateIndex) => {
            if (candidateIndex === index) {
                return false;
            }

            const comparator = extractCreatedAtComparator(child);
            return comparator?.operator === '$lte' && comparator.value === end;
        });

        if (upperBoundIndex === -1) {
            continue;
        }

        return {
            filter: {
                field: 'created_at',
                operator: 'is',
                values: [date]
            },
            remainingChildren: children.filter((_, candidateIndex) => candidateIndex !== index && candidateIndex !== upperBoundIndex)
        };
    }

    return {
        filter: null,
        remainingChildren: children
    };
}

function importLegacyCommentNode(node: AstNode, timezone: string): UnstampedFilter[] {
    if (Array.isArray(node.$and)) {
        const {filter, remainingChildren} = matchExactDateCompound(node.$and as AstNode[], timezone);
        const simpleFilters = remainingChildren.flatMap(child => importLegacyCommentNode(child, timezone));

        return filter ? [filter, ...simpleFilters] : simpleFilters;
    }

    return importSimpleLegacyNodes([node], commentFields, timezone);
}

export function importLegacyCommentFilters(filter: string | undefined, timezone: string): Filter[] {
    const ast = parseLegacyFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    return stampImportedFilters(importLegacyCommentNode(ast, timezone));
}
