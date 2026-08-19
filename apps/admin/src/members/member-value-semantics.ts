import {escapeNqlString} from '@tryghost/nql-string';
import type {ClauseGroup, SemanticValue, SerializedValue, ValueSemantics} from '@/shared/filters';

const EMAIL_DISABLED = 'email_disabled';

function clauseFor(group: ClauseGroup, key: string) {
    return group.clauses.find(clause => clause.key === key);
}

export type SubscriptionOperator = 'is' | 'is-not';

export function subscriptionSemantics(): ValueSemantics<SubscriptionOperator> {
    return {
        operators: ['is', 'is-not'],
        serialize({operator, values}): SerializedValue | null {
            const value = values[0];
            const affirmative = operator === 'is';

            if (operator !== 'is' && operator !== 'is-not') {
                return null;
            }

            if (value === 'email-disabled') {
                return {fragments: [{key: EMAIL_DISABLED, expression: affirmative ? '1' : '0'}]};
            }

            if (value !== 'subscribed' && value !== 'unsubscribed') {
                return null;
            }

            const optedIn = value === 'subscribed';

            return affirmative
                ? {join: 'and', fragments: [{expression: String(optedIn)}, {key: EMAIL_DISABLED, expression: '0'}]}
                : {join: 'or', fragments: [{expression: String(!optedIn)}, {key: EMAIL_DISABLED, expression: '1'}]};
        },
        parse() {
            return null;
        },
        parseClauses(group): SemanticValue<SubscriptionOperator> | null {
            const disabled = clauseFor(group, EMAIL_DISABLED);
            const subscribed = clauseFor(group, 'subscribed');

            if (disabled && !subscribed && group.clauses.length === 1) {
                if (disabled.value === 1) {
                    return {operator: 'is', values: ['email-disabled']};
                }

                if (disabled.value === 0) {
                    return {operator: 'is-not', values: ['email-disabled']};
                }

                return null;
            }

            if (!subscribed || typeof subscribed.value !== 'boolean') {
                return null;
            }

            if (!disabled && group.clauses.length === 1) {
                return {operator: 'is', values: [subscribed.value ? 'subscribed' : 'unsubscribed']};
            }

            if (!disabled) {
                return null;
            }

            if (group.clauses.length !== 2) {
                return null;
            }

            if (group.join === 'and' && disabled.value === 0) {
                return {operator: 'is', values: [subscribed.value ? 'subscribed' : 'unsubscribed']};
            }

            if (group.join === 'or' && disabled.value === 1) {
                return {operator: 'is-not', values: [subscribed.value ? 'unsubscribed' : 'subscribed']};
            }

            return null;
        }
    };
}

export type FeedbackOperator = '1' | '0';

export function feedbackSemantics(): ValueSemantics<FeedbackOperator> {
    return {
        operators: ['1', '0'],
        serialize({operator, values}): SerializedValue | null {
            const postId = values[0];

            if (typeof postId !== 'string' || !postId) {
                return null;
            }

            return {
                join: 'and',
                fragments: [
                    {expression: escapeNqlString(postId)},
                    {key: 'feedback.score', expression: operator}
                ]
            };
        },
        parse() {
            return null;
        },
        parseClauses(group): SemanticValue<FeedbackOperator> | null {
            const post = clauseFor(group, 'feedback.post_id');
            const score = clauseFor(group, 'feedback.score');

            if (group.clauses.length !== 2 || group.join !== 'and' || !post || !score || typeof post.value !== 'string') {
                return null;
            }

            if (score.value !== 0 && score.value !== 1) {
                return null;
            }

            return {operator: score.value === 1 ? '1' : '0', values: [post.value]};
        }
    };
}
