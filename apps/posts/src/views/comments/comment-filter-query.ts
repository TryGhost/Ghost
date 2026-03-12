import moment from 'moment-timezone';
import type {AstNode} from '../filters/filter-ast';
import {dispatchSimpleNodes, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import {getDayBoundsInUtc} from '../filters/filter-normalization';
import {commentFields} from './comment-fields';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';

interface ExactDateMatchResult {
    predicate: ParsedPredicate | null;
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

        const date = moment.tz(lowerBound.value, timezone).format('YYYY-MM-DD');
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
        const simplePredicates = remainingChildren.flatMap(child => parseCommentNode(child, timezone));

        return predicate ? [predicate, ...simplePredicates] : simplePredicates;
    }

    return dispatchSimpleNodes([node], commentFields, timezone);
}

export function parseCommentFilter(filter: string | undefined, timezone: string): FilterPredicate[] {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    return stampPredicates(parseCommentNode(ast, timezone));
}

export function serializeCommentFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    return serializePredicates(predicates, commentFields, timezone);
}
