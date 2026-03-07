import nql from '@tryghost/nql-lang';
import type {Filter} from '@tryghost/shade';

type LegacyNode = Record<string, unknown>;

interface TranslationResult {
    filters: Filter[];
    isComplete: boolean;
}

const SUPPORTED_FIELDS = new Set([
    'name',
    'email',
    'label',
    'tier_id',
    'status',
    'subscribed',
    'signup',
    'conversion',
    'email_count',
    'email_opened_count',
    'email_open_rate',
    'emails.post_id',
    'opened_emails.post_id',
    'clicked_links.post_id',
    'offer_redemptions',
    'subscriptions.plan_interval',
    'subscriptions.status'
]);

const MULTISELECT_FIELDS = new Set(['label', 'tier_id', 'offer_redemptions']);

const DATE_FIELDS = new Set([
    'last_seen_at',
    'created_at',
    'subscriptions.start_date',
    'subscriptions.current_period_end'
]);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isLegacyNodeArray(value: unknown): value is LegacyNode[] {
    return Array.isArray(value) && value.every(isObject);
}

function isTrueLike(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
}

function isFalseLike(value: unknown): boolean {
    return value === false || value === 0 || value === '0';
}

function getComparatorNode(nodes: LegacyNode[], key: string): unknown {
    const match = nodes.find(node => Object.prototype.hasOwnProperty.call(node, key));
    return match?.[key];
}

function getExactComparatorValues(nodes: LegacyNode[], keys: string[]): Record<string, unknown> | null {
    if (nodes.length !== keys.length) {
        return null;
    }

    const keySet = new Set(keys);
    const values: Record<string, unknown> = {};

    for (const node of nodes) {
        const nodeKeys = Object.keys(node);

        if (nodeKeys.length !== 1) {
            return null;
        }

        const [nodeKey] = nodeKeys;
        if (!keySet.has(nodeKey) || Object.prototype.hasOwnProperty.call(values, nodeKey)) {
            return null;
        }

        values[nodeKey] = node[nodeKey];
    }

    if (!keys.every(key => Object.prototype.hasOwnProperty.call(values, key))) {
        return null;
    }

    return values;
}

function unescapeRegexSource(value: string): string {
    // Keep parity with Ember filter parsing which unescapes regex-derived values.
    return value.replace(/\\/g, '');
}

function parseRegexNode(nqlValue: unknown): {operator: string; value: string} | null {
    if (!isObject(nqlValue)) {
        return null;
    }

    const regexValue = nqlValue.$regex;
    if (regexValue instanceof RegExp) {
        const source = regexValue.source;
        if (source.startsWith('^')) {
            return {operator: 'starts-with', value: unescapeRegexSource(source.slice(1))};
        }
        if (source.endsWith('$')) {
            return {operator: 'ends-with', value: unescapeRegexSource(source.slice(0, -1))};
        }
        return {operator: 'contains', value: unescapeRegexSource(source)};
    }

    const notValue = nqlValue.$not;
    if (notValue instanceof RegExp) {
        return {operator: 'does-not-contain', value: unescapeRegexSource(notValue.source)};
    }

    return null;
}

function parseSimpleCondition(field: string, nqlValue: unknown): {operator: string; values: string[]} | null {
    if (DATE_FIELDS.has(field)) {
        return null;
    }

    if (!isObject(nqlValue)) {
        const value = String(nqlValue);
        if (MULTISELECT_FIELDS.has(field)) {
            return {operator: 'is_any_of', values: [value]};
        }
        return {operator: 'is', values: [value]};
    }

    const regexNode = parseRegexNode(nqlValue);
    if (regexNode) {
        return {operator: regexNode.operator, values: [regexNode.value]};
    }

    if (Array.isArray(nqlValue.$in)) {
        return {
            operator: 'is_any_of',
            values: nqlValue.$in.map(value => String(value))
        };
    }

    if (Array.isArray(nqlValue.$nin)) {
        return {
            operator: 'is_not_any_of',
            values: nqlValue.$nin.map(value => String(value))
        };
    }

    if (nqlValue.$ne !== undefined) {
        return {operator: 'is-not', values: [String(nqlValue.$ne)]};
    }

    if (nqlValue.$gt !== undefined) {
        return {operator: 'is-greater', values: [String(nqlValue.$gt)]};
    }

    if (nqlValue.$gte !== undefined) {
        return {operator: 'is-or-greater', values: [String(nqlValue.$gte)]};
    }

    if (nqlValue.$lt !== undefined) {
        return {operator: 'is-less', values: [String(nqlValue.$lt)]};
    }

    if (nqlValue.$lte !== undefined) {
        return {operator: 'is-or-less', values: [String(nqlValue.$lte)]};
    }

    return null;
}

function parseSubscribedFilter(node: LegacyNode): Filter | null {
    if (Object.keys(node).length === 1 && Object.prototype.hasOwnProperty.call(node, 'email_disabled')) {
        return {
            id: 'subscribed',
            field: 'subscribed',
            operator: isTrueLike(node.email_disabled) ? 'is' : 'is-not',
            values: ['email-disabled']
        };
    }

    if (isLegacyNodeArray(node.$and)) {
        const values = getExactComparatorValues(node.$and, ['subscribed', 'email_disabled']);
        const subscribed = values?.subscribed;
        const emailDisabled = values?.email_disabled;

        if (typeof subscribed === 'boolean' && isFalseLike(emailDisabled)) {
            return {
                id: 'subscribed',
                field: 'subscribed',
                operator: 'is',
                values: [subscribed ? 'subscribed' : 'unsubscribed']
            };
        }
    }

    if (isLegacyNodeArray(node.$or)) {
        const values = getExactComparatorValues(node.$or, ['subscribed', 'email_disabled']);
        const subscribed = values?.subscribed;
        const emailDisabled = values?.email_disabled;

        if (typeof subscribed === 'boolean' && isTrueLike(emailDisabled)) {
            return {
                id: 'subscribed',
                field: 'subscribed',
                operator: 'is-not',
                values: [subscribed ? 'unsubscribed' : 'subscribed']
            };
        }
    }

    return null;
}

function parseNewsletterFilter(node: LegacyNode): Filter | null {
    if (isLegacyNodeArray(node.$and)) {
        const values = getExactComparatorValues(node.$and, ['newsletters.slug', 'email_disabled']);
        const slugNode = values?.['newsletters.slug'];
        const emailDisabled = values?.email_disabled;

        if (typeof slugNode === 'string' && isFalseLike(emailDisabled)) {
            return {
                id: `newsletters.${slugNode}`,
                field: `newsletters.${slugNode}`,
                operator: 'is',
                values: ['subscribed']
            };
        }
    }

    if (isLegacyNodeArray(node.$or)) {
        const values = getExactComparatorValues(node.$or, ['newsletters.slug', 'email_disabled']);
        const slugNode = values?.['newsletters.slug'];
        const emailDisabled = values?.email_disabled;

        if (isObject(slugNode) && typeof slugNode.$ne === 'string' && isTrueLike(emailDisabled)) {
            return {
                id: `newsletters.${slugNode.$ne}`,
                field: `newsletters.${slugNode.$ne}`,
                operator: 'is',
                values: ['unsubscribed']
            };
        }
    }

    return null;
}

function parseNewsletterFeedbackFilter(node: LegacyNode): Filter | null {
    if (!isLegacyNodeArray(node.$and) || node.$and.length !== 2) {
        return null;
    }

    const postIdNode = getComparatorNode(node.$and, 'feedback.post_id');
    const scoreNode = getComparatorNode(node.$and, 'feedback.score');

    if (typeof postIdNode !== 'string' || (scoreNode !== 0 && scoreNode !== 1)) {
        return null;
    }

    return {
        id: 'newsletter_feedback',
        field: 'newsletter_feedback',
        operator: String(scoreNode),
        values: [postIdNode]
    };
}

function parseNode(node: LegacyNode, context: {nextId: number}): {filters: Filter[]; isComplete: boolean} {
    const subscribedFilter = parseSubscribedFilter(node);
    if (subscribedFilter) {
        return {filters: [subscribedFilter], isComplete: true};
    }

    const newsletterFilter = parseNewsletterFilter(node);
    if (newsletterFilter) {
        return {filters: [newsletterFilter], isComplete: true};
    }

    const newsletterFeedbackFilter = parseNewsletterFeedbackFilter(node);
    if (newsletterFeedbackFilter) {
        return {filters: [newsletterFeedbackFilter], isComplete: true};
    }

    if (isLegacyNodeArray(node.$and)) {
        const filters: Filter[] = [];
        let isComplete = true;

        for (const child of node.$and) {
            const parsed = parseNode(child, context);
            filters.push(...parsed.filters);
            isComplete = isComplete && parsed.isComplete;
        }

        return {filters, isComplete};
    }

    if (isLegacyNodeArray(node.$or)) {
        return {filters: [], isComplete: false};
    }

    const filters: Filter[] = [];
    let isComplete = true;

    for (const [field, nqlValue] of Object.entries(node)) {
        if (field === '$and' || field === '$or') {
            continue;
        }

        if (!SUPPORTED_FIELDS.has(field)) {
            isComplete = false;
            continue;
        }

        const parsed = parseSimpleCondition(field, nqlValue);

        if (!parsed || parsed.values.length === 0) {
            isComplete = false;
            continue;
        }

        context.nextId += 1;
        filters.push({
            id: `${field}-${context.nextId}`,
            field,
            operator: parsed.operator,
            values: parsed.values
        });
    }

    return {filters, isComplete};
}

export function normalizeLegacyMembersFilter(filterParam: string): string {
    const trimmed = filterParam.trim();
    const surroundedBySingleGroup = /^\(.*\)$/.test(trimmed) && !/\).*\(/.test(trimmed);

    if (surroundedBySingleGroup) {
        return trimmed.slice(1, -1);
    }

    return trimmed;
}

export function translateLegacyMembersFilter(filterParam: string): TranslationResult {
    let parsed: unknown;
    const normalizedFilter = normalizeLegacyMembersFilter(filterParam);

    try {
        parsed = nql.parse(normalizedFilter);
    } catch {
        return {
            filters: [],
            isComplete: false
        };
    }

    if (!isObject(parsed)) {
        return {
            filters: [],
            isComplete: false
        };
    }

    const context = {nextId: 0};
    const result = parseNode(parsed, context);

    if (!result.filters.length) {
        return {
            filters: [],
            isComplete: false
        };
    }

    return result;
}
