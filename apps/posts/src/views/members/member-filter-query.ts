import {dispatchSimpleNodes, getFieldKeysByType, hasFieldKey, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import {extractAndClauses, serializeAstToNql} from '../filters/filter-ast';
import {memberFields} from './member-fields';
import {resolveField} from '../filters/resolve-field';
import type {AstNode} from '../filters/filter-ast';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';
import type {MemberFields} from './member-fields';

type CompoundMatcher = (node: AstNode) => ParsedPredicate | null;
const TIMEZONE_SENSITIVE_MEMBER_FIELDS = getFieldKeysByType(memberFields, 'date');

/**
 * Is this predicate's operator one the field currently advertises?
 *
 * This returns `false` for predicates the user can't reach in the UI because
 * the field never declares the operator. Hooks call this to drop unreachable
 * predicates before serializing or after parsing. The parser/serializer
 * themselves stay pure.
 */
export function isPredicateEnabled(predicate: ParsedPredicate, fields: MemberFields): boolean {
    const resolved = resolveField(fields, predicate.field, 'UTC');
    return resolved?.definition.operators.includes(predicate.operator) ?? false;
}

function getCompoundChildren(node: AstNode): {operator: '$and' | '$or'; children: AstNode[]} | null {
    if (Array.isArray(node.$and)) {
        return {operator: '$and', children: node.$and as AstNode[]};
    }

    if (Array.isArray(node.$or)) {
        return {operator: '$or', children: node.$or as AstNode[]};
    }

    return null;
}

function matchSubscribedNode(node: AstNode): ParsedPredicate | null {
    if (typeof node.subscribed === 'boolean') {
        return {
            field: 'subscribed',
            operator: 'is',
            values: [node.subscribed ? 'subscribed' : 'unsubscribed']
        };
    }

    if (typeof node.email_disabled === 'number') {
        if (node.email_disabled === 1) {
            return {
                field: 'subscribed',
                operator: 'is',
                values: ['email-disabled']
            };
        }

        if (node.email_disabled === 0) {
            return {
                field: 'subscribed',
                operator: 'is-not',
                values: ['email-disabled']
            };
        }
    }

    const compound = getCompoundChildren(node);

    if (!compound || compound.children.length !== 2) {
        return null;
    }

    let subscribedValue: boolean | undefined;
    let emailDisabledValue: number | undefined;

    for (const child of compound.children) {
        if (typeof child.subscribed === 'boolean') {
            subscribedValue = child.subscribed;
        }

        if (typeof child.email_disabled === 'number') {
            emailDisabledValue = child.email_disabled;
        }
    }

    if (compound.operator === '$and' && emailDisabledValue === 0 && subscribedValue !== undefined) {
        return {
            field: 'subscribed',
            operator: 'is',
            values: [subscribedValue ? 'subscribed' : 'unsubscribed']
        };
    }

    if (compound.operator === '$or' && emailDisabledValue === 1 && subscribedValue !== undefined) {
        return {
            field: 'subscribed',
            operator: 'is-not',
            values: [subscribedValue ? 'unsubscribed' : 'subscribed']
        };
    }

    return null;
}

function matchNewsletterGroupedNode(node: AstNode): ParsedPredicate | null {
    const compound = getCompoundChildren(node);

    if (!compound || compound.children.length !== 2) {
        return null;
    }

    let slug: string | undefined;
    let emailDisabledValue: number | undefined;

    for (const child of compound.children) {
        const newsletterSlug = child['newsletters.slug'];

        if (typeof newsletterSlug === 'string') {
            slug = newsletterSlug;
        }

        if (
            newsletterSlug &&
            typeof newsletterSlug === 'object' &&
            !Array.isArray(newsletterSlug) &&
            typeof (newsletterSlug as Record<string, unknown>).$ne === 'string'
        ) {
            slug = (newsletterSlug as Record<string, string>).$ne;
        }

        if (typeof child.email_disabled === 'number') {
            emailDisabledValue = child.email_disabled;
        }
    }

    if (!slug) {
        return null;
    }

    if (compound.operator === '$and' && emailDisabledValue === 0) {
        return {
            field: `newsletters.${slug}`,
            operator: 'is',
            values: ['subscribed']
        };
    }

    if (compound.operator === '$or' && emailDisabledValue === 1) {
        return {
            field: `newsletters.${slug}`,
            operator: 'is',
            values: ['unsubscribed']
        };
    }

    return null;
}

function matchFeedbackGroupedNode(node: AstNode): ParsedPredicate | null {
    const compound = getCompoundChildren(node);

    if (!compound || compound.operator !== '$and' || compound.children.length !== 2) {
        return null;
    }

    let postId: string | undefined;
    let score: number | undefined;

    for (const child of compound.children) {
        if (typeof child['feedback.post_id'] === 'string') {
            postId = child['feedback.post_id'] as string;
        }

        if (typeof child['feedback.score'] === 'number') {
            score = child['feedback.score'] as number;
        }
    }

    if (!postId || (score !== 0 && score !== 1)) {
        return null;
    }

    return {
        field: 'newsletter_feedback',
        operator: String(score),
        values: [postId]
    };
}

const MEMBER_COMPOUND_MATCHERS: CompoundMatcher[] = [
    matchSubscribedNode,
    matchNewsletterGroupedNode,
    matchFeedbackGroupedNode
];

function matchMemberCompoundNode(node: AstNode): ParsedPredicate | null {
    for (const matcher of MEMBER_COMPOUND_MATCHERS) {
        const parsed = matcher(node);

        if (parsed) {
            return parsed;
        }
    }

    return null;
}

function parseMemberNode(node: AstNode, timezone: string): ParsedPredicate[] {
    const matched = matchMemberCompoundNode(node);

    if (matched) {
        return [matched];
    }

    const compound = getCompoundChildren(node);

    if (compound?.operator === '$and') {
        return compound.children.flatMap(child => parseMemberNode(child, timezone));
    }

    return dispatchSimpleNodes([node], memberFields, timezone);
}

export interface ParsedMemberFilterState {
    predicates: FilterPredicate[];
    unknownClauses: string[];
}

interface MemberFilterClause {
    node: AstNode;
    predicates: ParsedPredicate[];
}

/**
 * Parses NQL and splits the AST into its top-level AND clauses, each parsed
 * independently. Clauses the member field map can't represent come back with
 * an empty `predicates` array, so callers can preserve their NQL instead of
 * silently dropping properties they don't understand.
 */
function parseMemberFilterClauses(filter: string | undefined, timezone: string): MemberFilterClause[] {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    // Legacy Ember compounds can span the whole filter without parentheses
    // (e.g. `subscribed:true+email_disabled:0`), so the matchers get a shot
    // at the root before the filter is split into clauses.
    const rootCompound = matchMemberCompoundNode(ast);

    if (rootCompound) {
        return [{node: ast, predicates: [rootCompound]}];
    }

    return extractAndClauses(ast).map(node => ({node, predicates: parseMemberNode(node, timezone)}));
}

/**
 * Parses NQL into the state the filter UI works with: predicates for every
 * clause the field map can represent (enforced via `isPredicateEnabled`),
 * plus the re-serialized NQL of every clause it cannot. Unknown clauses
 * still filter the member list — they just have no UI representation.
 */
export function parseMemberFilterState(filter: string | undefined, timezone: string, fields: MemberFields): ParsedMemberFilterState {
    const known: ParsedPredicate[] = [];
    const unknownClauses: string[] = [];

    for (const clause of parseMemberFilterClauses(filter, timezone)) {
        const enabled = clause.predicates.filter(predicate => isPredicateEnabled(predicate, fields));

        if (enabled.length > 0) {
            known.push(...enabled);
        } else {
            const nql = serializeAstToNql(clause.node);

            if (nql !== undefined) {
                unknownClauses.push(nql);
            }
        }
    }

    return {predicates: stampPredicates(known), unknownClauses};
}

/**
 * Parses NQL into predicates. Pure: callers are responsible for filtering the
 * output via `isPredicateEnabled` against the field map they want to enforce.
 */
export function parseMemberFilter(filter: string | undefined, timezone: string): FilterPredicate[] {
    return stampPredicates(parseMemberFilterClauses(filter, timezone).flatMap(clause => clause.predicates));
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
export function serializeMemberFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    return serializePredicates(predicates, memberFields, timezone);
}
