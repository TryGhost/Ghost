import {dispatchSimpleNodes, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import {memberFields} from './member-fields';
import type {AstNode} from '../filters/filter-ast';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';

type CompoundMatcher = (node: AstNode) => ParsedPredicate | null;
const TIMEZONE_SENSITIVE_MEMBER_FIELDS = new Set([
    'last_seen_at',
    'created_at',
    'subscriptions.start_date',
    'subscriptions.current_period_end'
]);

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

function hasTimezoneSensitiveMemberField(node: AstNode): boolean {
    if (Object.keys(node).some(key => TIMEZONE_SENSITIVE_MEMBER_FIELDS.has(key))) {
        return true;
    }

    const compound = getCompoundChildren(node);

    if (compound) {
        return compound.children.some(child => hasTimezoneSensitiveMemberField(child as AstNode));
    }

    return Object.values(node).some((value) => {
        if (Array.isArray(value)) {
            return value.some((child) => {
                return child !== null && typeof child === 'object' && hasTimezoneSensitiveMemberField(child as AstNode);
            });
        }

        return value !== null && typeof value === 'object' && hasTimezoneSensitiveMemberField(value as AstNode);
    });
}

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
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    return stampPredicates(parseMemberNode(ast, timezone));
}

export function hasTimezoneSensitiveMemberFilter(filter: string | undefined): boolean {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return false;
    }

    return hasTimezoneSensitiveMemberField(ast);
}

export function serializeMemberFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    return serializePredicates(predicates, memberFields, timezone);
}
