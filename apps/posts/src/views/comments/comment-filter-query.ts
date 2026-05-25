import {commentFields} from './comment-fields';
import {dispatchSimpleNodes, getFieldKeysByType, hasFieldKey, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import type {AstNode} from '../filters/filter-ast';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';

const TIMEZONE_SENSITIVE_COMMENT_FIELDS = getFieldKeysByType(commentFields, 'date');

function parseCommentNode(node: AstNode, timezone: string): ParsedPredicate[] {
    if (Array.isArray(node.$and)) {
        return (node.$and as AstNode[]).flatMap(child => parseCommentNode(child, timezone));
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

export function hasTimezoneSensitiveCommentFilter(filter: string | undefined): boolean {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return false;
    }

    return hasFieldKey(ast, TIMEZONE_SENSITIVE_COMMENT_FIELDS);
}

export function serializeCommentFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    return serializePredicates(predicates, commentFields, timezone);
}
