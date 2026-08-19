import {memberFields} from './member-fields';
import {type FilterPredicate, type ParsedPredicate, getFieldKeysByType, hasFieldKey, isPredicateEnabled as isEnabled, parseFilterToAst, parseNodeToPredicates, serializePredicates, stampPredicates} from '@/shared/filters';
import type {MemberFields} from './member-fields';

const TIMEZONE_SENSITIVE_MEMBER_FIELDS = getFieldKeysByType(memberFields, 'date');

export function isPredicateEnabled(predicate: ParsedPredicate, fields: MemberFields = memberFields): boolean {
    return isEnabled(predicate, fields);
}

/**
 * Parses NQL into predicates. Pure: callers are responsible for filtering the
 * output via `isPredicateEnabled` against the field map they want to enforce.
 */
export function parseMemberFilter(filter: string | undefined, timezone: string, fields: MemberFields = memberFields): FilterPredicate[] {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    return stampPredicates(parseNodeToPredicates(ast, fields, timezone));
}

export function hasTimezoneSensitiveMemberFilter(filter: string | undefined): boolean {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return false;
    }

    return hasFieldKey(ast, TIMEZONE_SENSITIVE_MEMBER_FIELDS);
}

/**
 * Serializes predicates back to NQL. Pure: callers should pre-filter via
 * `isPredicateEnabled` if they need to drop predicates the field map doesn't
 * advertise.
 */
export function serializeMemberFilters(predicates: FilterPredicate[], timezone: string, fields: MemberFields = memberFields): string | undefined {
    return serializePredicates(predicates, fields, timezone);
}
