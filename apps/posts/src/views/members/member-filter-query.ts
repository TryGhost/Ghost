import {dispatchSimpleNodes, getFieldKeysByType, hasFieldKey, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import {memberFields} from './member-fields';
import type {AstNode} from '../filters/filter-ast';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';

type CompoundMatcher = (node: AstNode) => ParsedPredicate | null;
const TIMEZONE_SENSITIVE_MEMBER_FIELDS = getFieldKeysByType(memberFields, 'date');

function getMemberFieldsWithOperator(operator: string): Set<string> {
    const set = new Set<string>();

    for (const [key, field] of Object.entries(memberFields)) {
        if ((field.operators as readonly string[]).includes(operator)) {
            set.add(key);
        }
    }

    return set;
}

const RELATIVE_PAST_DATE_FIELDS = getMemberFieldsWithOperator('in-the-last');
const RELATIVE_FUTURE_DATE_FIELDS = getMemberFieldsWithOperator('in-the-next');
const RELATIVE_PAST_CLAUSE = /^([\w.]+):>=now-(\d+)d$/;
const RELATIVE_FUTURE_CLAUSE = /^([\w.]+):<=now\+(\d+)d$/;
const NOW_BOUNDARY = /:[<>]=?now$/;

function isValidRelativeDayCount(value: number): boolean {
    return Number.isSafeInteger(value) && value > 0;
}

function splitTopLevelAnd(filter: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let inString: string | null = null;
    let current = '';

    for (let i = 0; i < filter.length; i += 1) {
        const ch = filter[i];
        const prev = i > 0 ? filter[i - 1] : '';

        if (inString) {
            if (ch === inString && prev !== '\\') {
                inString = null;
            }
            current += ch;
            continue;
        }

        if (ch === '\'' || ch === '"') {
            inString = ch;
            current += ch;
            continue;
        }

        if (ch === '(' || ch === '[') {
            depth += 1;
            current += ch;
            continue;
        }

        if (ch === ')' || ch === ']') {
            depth -= 1;
            current += ch;
            continue;
        }

        if (ch === '+' && depth === 0 && !NOW_BOUNDARY.test(current)) {
            if (current) {
                parts.push(current);
            }
            current = '';
            continue;
        }

        current += ch;
    }

    if (current) {
        parts.push(current);
    }

    return parts;
}

// Only top-level AND members are extracted. NQL itself parses `now-Nd` fine,
// but it resolves the token to an absolute date — losing the relative intent
// that we want the UI to render as an "in the last N days" widget. We
// intercept the syntactic form before it reaches NQL. Relative clauses inside
// an OR group (e.g. `created_at:>=now-7d,status:paid`) are not extracted; they
// stay in `rest` and NQL resolves them to an absolute-date predicate, which
// `parseMemberNode` then drops because it doesn't flatten generic OR groups.
function extractRelativeDatePredicates(filter: string): {predicates: ParsedPredicate[]; rest: string} {
    if (!filter) {
        return {predicates: [], rest: ''};
    }

    const clauses = splitTopLevelAnd(filter);
    const predicates: ParsedPredicate[] = [];
    const rest: string[] = [];

    for (const clause of clauses) {
        const past = RELATIVE_PAST_CLAUSE.exec(clause);

        if (past && RELATIVE_PAST_DATE_FIELDS.has(past[1])) {
            const days = Number(past[2]);

            if (isValidRelativeDayCount(days)) {
                predicates.push({
                    field: past[1],
                    operator: 'in-the-last',
                    values: [days]
                });
                continue;
            }
        }

        const future = RELATIVE_FUTURE_CLAUSE.exec(clause);

        if (future && RELATIVE_FUTURE_DATE_FIELDS.has(future[1])) {
            const days = Number(future[2]);

            if (isValidRelativeDayCount(days)) {
                predicates.push({
                    field: future[1],
                    operator: 'in-the-next',
                    values: [days]
                });
                continue;
            }
        }

        rest.push(clause);
    }

    return {predicates, rest: rest.join('+')};
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

function parseMemberNode(node: AstNode, timezone: string): ParsedPredicate[] {
    for (const matcher of MEMBER_COMPOUND_MATCHERS) {
        const parsed = matcher(node);

        if (parsed) {
            return [parsed];
        }
    }

    const compound = getCompoundChildren(node);

    if (compound?.operator === '$and') {
        return compound.children.flatMap(child => parseMemberNode(child, timezone));
    }

    return dispatchSimpleNodes([node], memberFields, timezone);
}

export function parseMemberFilter(filter: string | undefined, timezone: string): FilterPredicate[] {
    const {predicates: relativePredicates, rest} = extractRelativeDatePredicates(filter ?? '');
    const ast = parseFilterToAst(rest);
    const astPredicates = ast ? parseMemberNode(ast, timezone) : [];

    return stampPredicates([...relativePredicates, ...astPredicates]);
}

export function hasTimezoneSensitiveMemberFilter(filter: string | undefined): boolean {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return false;
    }

    return hasFieldKey(ast, TIMEZONE_SENSITIVE_MEMBER_FIELDS);
}

function serializeRelativeDatePredicate(predicate: FilterPredicate): string | null {
    const days = predicate.values[0];

    if (typeof days !== 'number' || !isValidRelativeDayCount(days)) {
        return null;
    }

    if (predicate.operator === 'in-the-last' && RELATIVE_PAST_DATE_FIELDS.has(predicate.field)) {
        return `${predicate.field}:>=now-${days}d`;
    }

    if (predicate.operator === 'in-the-next' && RELATIVE_FUTURE_DATE_FIELDS.has(predicate.field)) {
        return `${predicate.field}:<=now+${days}d`;
    }

    return null;
}

export function serializeMemberFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    const relativeClauses: string[] = [];
    const remainder: FilterPredicate[] = [];

    for (const predicate of predicates) {
        if (predicate.operator === 'in-the-last' || predicate.operator === 'in-the-next') {
            const clause = serializeRelativeDatePredicate(predicate);

            if (clause) {
                relativeClauses.push(clause);
            }
            continue;
        }

        remainder.push(predicate);
    }

    const remainderString = serializePredicates(remainder, memberFields, timezone);
    const remainderClauses = remainderString ? splitTopLevelAnd(remainderString) : [];
    const allClauses = [...relativeClauses, ...remainderClauses].sort((left, right) => left.localeCompare(right));

    if (!allClauses.length) {
        return undefined;
    }

    return allClauses.join('+');
}
