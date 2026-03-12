import type {AstNode} from '../filters/filter-ast';
import {extractComparator, flattenTopLevelNodes} from '../filters/filter-ast';
import {dispatchSimpleNodes, parseFilterToAst, serializePredicates, stampPredicates} from '../filters/filter-query-core';
import {memberFields} from './member-fields';
import type {FilterPredicate, ParsedPredicate} from '../filters/filter-types';

interface CompoundMatchResult {
    predicates: ParsedPredicate[];
    remainingNodes: AstNode[];
}

interface LeafPairMatch {
    indices: [number, number];
    predicate: ParsedPredicate;
}

type GroupedNodeMatcher = (node: AstNode) => ParsedPredicate | null;
type LeafPairMatcher = (nodes: AstNode[], index: number) => LeafPairMatch | null;
type CompoundMatcher = (nodes: AstNode[]) => CompoundMatchResult;

function getCompoundChildren(node: AstNode): {operator: '$and' | '$or'; children: AstNode[]} | null {
    if (Array.isArray(node.$and)) {
        return {operator: '$and', children: node.$and as AstNode[]};
    }

    if (Array.isArray(node.$or)) {
        return {operator: '$or', children: node.$or as AstNode[]};
    }

    return null;
}

function findLeaf(nodes: AstNode[], startIndex: number, matcher: (node: AstNode) => boolean): number {
    return nodes.findIndex((node, index) => index > startIndex && matcher(node));
}

function claimGroupedMatch(
    remainingNodes: AstNode[],
    index: number,
    predicates: ParsedPredicate[],
    matcher: (node: AstNode) => ParsedPredicate | null
): boolean {
    const groupedMatch = matcher(remainingNodes[index]);

    if (!groupedMatch) {
        return false;
    }

    predicates.push(groupedMatch);
    remainingNodes.splice(index, 1);

    return true;
}

function claimLeafPair(
    remainingNodes: AstNode[],
    indices: [number, number],
    predicates: ParsedPredicate[],
    predicate: ParsedPredicate
) {
    predicates.push(predicate);

    const removalIndices = [...indices].sort((left, right) => right - left);
    for (const removalIndex of removalIndices) {
        remainingNodes.splice(removalIndex, 1);
    }
}

function collectCompoundMatches(
    nodes: AstNode[],
    groupedMatcher: GroupedNodeMatcher,
    leafPairMatcher: LeafPairMatcher
): CompoundMatchResult {
    const predicates: ParsedPredicate[] = [];
    const remainingNodes = [...nodes];

    for (let index = 0; index < remainingNodes.length; index += 1) {
        if (claimGroupedMatch(remainingNodes, index, predicates, groupedMatcher)) {
            index -= 1;
            continue;
        }

        const leafPairMatch = leafPairMatcher(remainingNodes, index);

        if (!leafPairMatch) {
            continue;
        }

        claimLeafPair(remainingNodes, leafPairMatch.indices, predicates, leafPairMatch.predicate);
        index -= 1;
    }

    return {predicates, remainingNodes};
}

function matchSubscribedGroupedNode(node: AstNode): ParsedPredicate | null {
    const compound = getCompoundChildren(node);

    if (!compound) {
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

    if (!compound) {
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

    if (!compound || compound.operator !== '$and') {
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

function matchSubscribedCompound(nodes: AstNode[]): CompoundMatchResult {
    return collectCompoundMatches(nodes, matchSubscribedGroupedNode, (remainingNodes, index) => {
        const comparator = extractComparator(remainingNodes[index]);

        if (!comparator || comparator.field !== 'subscribed' || typeof comparator.value !== 'boolean') {
            return null;
        }

        const emailDisabledIndex = findLeaf(remainingNodes, index, (node) => {
            const candidate = extractComparator(node);
            return candidate?.field === 'email_disabled' && candidate.value === 0;
        });

        if (emailDisabledIndex === -1) {
            return null;
        }

        return {
            indices: [index, emailDisabledIndex],
            predicate: {
                field: 'subscribed',
                operator: 'is',
                values: [comparator.value ? 'subscribed' : 'unsubscribed']
            }
        };
    });
}

function matchNewsletterCompound(nodes: AstNode[]): CompoundMatchResult {
    return collectCompoundMatches(nodes, matchNewsletterGroupedNode, (remainingNodes, index) => {
        const comparator = extractComparator(remainingNodes[index]);

        if (!comparator || comparator.field !== 'newsletters.slug' || typeof comparator.value !== 'string') {
            return null;
        }

        const emailDisabledIndex = findLeaf(remainingNodes, index, (node) => {
            const candidate = extractComparator(node);
            return candidate?.field === 'email_disabled' && candidate.value === 0;
        });

        if (emailDisabledIndex === -1) {
            return null;
        }

        return {
            indices: [index, emailDisabledIndex],
            predicate: {
                field: `newsletters.${comparator.value}`,
                operator: 'is',
                values: ['subscribed']
            }
        };
    });
}

function matchFeedbackCompound(nodes: AstNode[]): CompoundMatchResult {
    return collectCompoundMatches(nodes, matchFeedbackGroupedNode, (remainingNodes, index) => {
        const comparator = extractComparator(remainingNodes[index]);

        if (!comparator || comparator.field !== 'feedback.post_id' || typeof comparator.value !== 'string') {
            return null;
        }

        const scoreIndex = findLeaf(remainingNodes, index, (node) => {
            const candidate = extractComparator(node);
            return candidate?.field === 'feedback.score' && (candidate.value === 0 || candidate.value === 1);
        });

        if (scoreIndex === -1) {
            return null;
        }

        const scoreComparator = extractComparator(remainingNodes[scoreIndex]);

        if (!scoreComparator || (scoreComparator.value !== 0 && scoreComparator.value !== 1)) {
            return null;
        }

        return {
            indices: [index, scoreIndex],
            predicate: {
                field: 'newsletter_feedback',
                operator: String(scoreComparator.value),
                values: [comparator.value]
            }
        };
    });
}

const MEMBER_COMPOUND_MATCHERS: CompoundMatcher[] = [
    matchSubscribedCompound,
    matchNewsletterCompound,
    matchFeedbackCompound
];

export function parseMemberFilter(filter: string | undefined, timezone: string): FilterPredicate[] {
    const ast = parseFilterToAst(filter ?? '');

    if (!ast) {
        return [];
    }

    let remainingNodes = flattenTopLevelNodes(ast);
    const compoundPredicates: ParsedPredicate[] = [];

    for (const matcher of MEMBER_COMPOUND_MATCHERS) {
        const result = matcher(remainingNodes);
        compoundPredicates.push(...result.predicates);
        remainingNodes = result.remainingNodes;
    }

    const simplePredicates = dispatchSimpleNodes(remainingNodes, memberFields, timezone);

    return stampPredicates([...compoundPredicates, ...simplePredicates]);
}

export function serializeMemberFilters(predicates: FilterPredicate[], timezone: string): string | undefined {
    return serializePredicates(predicates, memberFields, timezone);
}
