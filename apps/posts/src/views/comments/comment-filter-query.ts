import moment from 'moment-timezone';
import type {AstNode} from '../filters/filter-ast';
import {flattenTopLevelNodes} from '../filters/filter-ast';
import {dispatchSimpleNodes, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import {getDayBoundsInUtc} from '../filters/filter-normalization';
import {commentFields} from './comment-fields';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';

interface CompoundMatchResult {
    predicates: ParsedPredicate[];
    remainingNodes: AstNode[];
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

function matchExactDateCompound(nodes: AstNode[], timezone: string): CompoundMatchResult {
    const predicates: ParsedPredicate[] = [];
    const remainingNodes = [...nodes];

    for (let index = 0; index < remainingNodes.length; index += 1) {
        const comparator = extractCreatedAtComparator(remainingNodes[index]);

        if (!comparator) {
            continue;
        }

        const date = moment.tz(comparator.value, timezone).format('YYYY-MM-DD');
        const {start, end} = getDayBoundsInUtc(date, timezone);
        const hasLowerBound = comparator.operator === '$gte' && comparator.value === start;
        const hasUpperBound = comparator.operator === '$lte' && comparator.value === end;

        if (!hasLowerBound && !hasUpperBound) {
            continue;
        }

        const expectedOperator = hasLowerBound ? '$lte' : '$gte';
        const expectedValue = hasLowerBound ? end : start;
        const matchIndex = remainingNodes.findIndex((node, candidateIndex) => {
            if (candidateIndex === index) {
                return false;
            }

            const candidate = extractCreatedAtComparator(node);
            return candidate?.operator === expectedOperator && candidate.value === expectedValue;
        });

        if (matchIndex === -1) {
            continue;
        }

        predicates.push({
            field: 'created_at',
            operator: 'is',
            values: [date]
        });

        const indicesToRemove = [index, matchIndex].sort((left, right) => right - left);
        for (const removalIndex of indicesToRemove) {
            remainingNodes.splice(removalIndex, 1);
        }

        index -= 1;
    }

    return {predicates, remainingNodes};
}

export function parseCommentFilter(filter: string | undefined, timezone: string): FilterPredicate[] {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    const {predicates: compoundPredicates, remainingNodes} = matchExactDateCompound(flattenTopLevelNodes(ast), timezone);
    const simplePredicates = dispatchSimpleNodes(remainingNodes, commentFields, timezone);

    return stampPredicates([...compoundPredicates, ...simplePredicates]);
}

export function serializeCommentFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    return serializePredicates(predicates, commentFields, timezone);
}
