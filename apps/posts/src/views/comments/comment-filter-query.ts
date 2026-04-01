import moment from 'moment-timezone';
import {commentFields} from './comment-fields';
import {dispatchSimpleNodes, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import {getDayBoundsInUtc} from '../filters/filter-normalization';
import type {AstNode} from '../filters/filter-ast';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';

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

function matchExactDateCompound(children: AstNode[], timezone: string): {predicate: ParsedPredicate | null; remainingChildren: AstNode[]} {
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
            predicate: {
                field: 'created_at',
                operator: 'is',
                values: [date]
            },
            remainingChildren: children.filter((_, candidateIndex) => candidateIndex !== index && candidateIndex !== upperBoundIndex)
        };
    }

    return {
        predicate: null,
        remainingChildren: children
    };
}

function parseCommentNode(node: AstNode, timezone: string): ParsedPredicate[] {
    if (Array.isArray(node.$and)) {
        const {predicate, remainingChildren} = matchExactDateCompound(node.$and as AstNode[], timezone);
        const parsedChildren = remainingChildren.flatMap(child => parseCommentNode(child, timezone));

        return predicate ? [predicate, ...parsedChildren] : parsedChildren;
    }

    return dispatchSimpleNodes([node], commentFields, timezone);
}

function hasTimezoneSensitiveCommentField(node: AstNode): boolean {
    if (Object.keys(node).includes('created_at')) {
        return true;
    }

    return Object.values(node).some((value) => {
        if (Array.isArray(value)) {
            return value.some(child => child !== null && typeof child === 'object' && hasTimezoneSensitiveCommentField(child as AstNode));
        }

        return value !== null && typeof value === 'object' && hasTimezoneSensitiveCommentField(value as AstNode);
    });
}

export function parseCommentFilter(filter: string | undefined, timezone: string): FilterPredicate[] {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    return stampPredicates(parseCommentNode(ast, timezone));
}

export function hasTimezoneSensitiveCommentFilter(filter: string | undefined): boolean {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return false;
    }

    return hasTimezoneSensitiveCommentField(ast);
}

export function serializeCommentFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    return serializePredicates(predicates, commentFields, timezone);
}
