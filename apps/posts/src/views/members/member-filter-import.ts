import {importSimpleLegacyNodes, parseLegacyFilterToAst, stampImportedFilters} from '../filters/legacy-filter-import';
import {memberFields} from './member-fields';
import type {AstNode} from '../filters/filter-ast';
import type {Filter} from '@tryghost/shade';
import type {UnstampedFilter} from '../filters/filter-types';

type CompoundMatcher = (node: AstNode) => UnstampedFilter | null;

function getCompoundChildren(node: AstNode): {operator: '$and' | '$or'; children: AstNode[]} | null {
    if (Array.isArray(node.$and)) {
        return {operator: '$and', children: node.$and as AstNode[]};
    }

    if (Array.isArray(node.$or)) {
        return {operator: '$or', children: node.$or as AstNode[]};
    }

    return null;
}

function matchSubscribedNode(node: AstNode): UnstampedFilter | null {
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

function matchNewsletterGroupedNode(node: AstNode): UnstampedFilter | null {
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

function matchFeedbackGroupedNode(node: AstNode): UnstampedFilter | null {
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

const MEMBER_COMPOUND_IMPORTERS: CompoundMatcher[] = [
    matchSubscribedNode,
    matchNewsletterGroupedNode,
    matchFeedbackGroupedNode
];

function importLegacyMemberNode(node: AstNode, timezone: string): UnstampedFilter[] {
    for (const importer of MEMBER_COMPOUND_IMPORTERS) {
        const parsed = importer(node);

        if (parsed) {
            return [parsed];
        }
    }

    const compound = getCompoundChildren(node);

    if (compound?.operator === '$and') {
        return compound.children.flatMap(child => importLegacyMemberNode(child, timezone));
    }

    return importSimpleLegacyNodes([node], memberFields, timezone);
}

export function importLegacyMemberFilters(filter: string | undefined, timezone: string): Filter[] {
    const ast = parseLegacyFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    return stampImportedFilters(importLegacyMemberNode(ast, timezone));
}
