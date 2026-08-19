import {domainField, getCompoundChildren, readNegatedString} from '@/shared/filters';
import type {AstNode, CompoundMatch, PlainAddressing, FieldProvider, SemanticValue, SerializedValue, ValueSemantics} from '@/shared/filters';

const KEY_PREFIX = 'newsletters.';
const SLUG_ATTRIBUTE = 'newsletters.slug';
const EMAIL_DISABLED = 'email_disabled';

const OPTIONS = [
    {value: 'subscribed', label: 'Subscribed'},
    {value: 'unsubscribed', label: 'Unsubscribed'}
];

export function newsletterSubscriptionSemantics(slug?: string): ValueSemantics<'is'> {
    return {
        operators: ['is'],
        serialize({operator, values}, ctx): SerializedValue | null {
            const writing = slug ?? ctx.params.slug;
            const value = values[0];

            if (!writing || operator !== 'is') {
                return null;
            }

            if (value === 'subscribed') {
                return {join: 'and', fragments: [{expression: writing}, {key: EMAIL_DISABLED, expression: '0'}]};
            }

            if (value === 'unsubscribed') {
                return {join: 'or', fragments: [{expression: `-${writing}`}, {key: EMAIL_DISABLED, expression: '1'}]};
            }

            return null;
        },
        parse(): SemanticValue<'is'> | null {
            return null;
        }
    };
}

export function newsletterAddressing(slug?: string): PlainAddressing {
    return {
        address(predicate, ctx) {
            return (slug ?? ctx.params.slug) ? {valueKey: SLUG_ATTRIBUTE, values: predicate.values} : null;
        },

        match() {
            return null;
        },

        matchCompound(node: AstNode): CompoundMatch | null {
            for (const join of ['and', 'or'] as const) {
                const children = getCompoundChildren(node, join === 'and' ? '$and' : '$or');

                if (!children || children.length !== 2) {
                    continue;
                }

                let named: string | undefined;
                let negated = false;
                let disabled: number | undefined;

                for (const child of children) {
                    const raw = child[SLUG_ATTRIBUTE];

                    if (typeof raw === 'string') {
                        named = raw;
                        negated = false;
                    }

                    const denied = readNegatedString(raw);

                    if (denied !== null) {
                        named = denied;
                        negated = true;
                    }

                    if (typeof child[EMAIL_DISABLED] === 'number') {
                        disabled = child[EMAIL_DISABLED];
                    }
                }

                // The pair means the pair. "Subscribed" is written as being on the list and not
                // bounced, joined by and; "unsubscribed" is the denial of exactly that, joined by
                // or. Any other arrangement of the same three parts says something else — being
                // on the list *or* having bounced is a wider set of members than being on it —
                // so it is left unread rather than answered for.
                const subscribed = !negated && join === 'and' && disabled === 0;
                const unsubscribed = negated && join === 'or' && disabled === 1;

                if (!named || (!subscribed && !unsubscribed)) {
                    continue;
                }

                return {
                    kind: 'predicate',
                    predicate: {
                        field: `${KEY_PREFIX}${named}`,
                        operator: 'is',
                        values: [subscribed ? 'subscribed' : 'unsubscribed']
                    }
                };
            }

            return null;
        }
    };
}


export interface NewsletterDefinition {
    slug: string;
    name: string;
}

export function newsletterDescriptor(newsletter: NewsletterDefinition) {
    return domainField({
        key: `${KEY_PREFIX}${newsletter.slug}`,
        icon: 'newspaper',
        semantics: newsletterSubscriptionSemantics(newsletter.slug),
        addressing: newsletterAddressing(newsletter.slug),
        operators: ['is'],
        options: OPTIONS,
        ui: {
            label: newsletter.name,
            type: 'select',
            searchable: false,
            hideOperatorSelect: true
        }
    });
}

export function newsletterProvider(newsletters: readonly NewsletterDefinition[] | undefined): FieldProvider {
    return {
        resolved: newsletters !== undefined,
        claims: [SLUG_ATTRIBUTE],
        fields: (newsletters ?? []).map(newsletterDescriptor)
    };
}

export const NEWSLETTER_FIELD = domainField({
    key: `${KEY_PREFIX}:slug`,
    icon: 'newspaper',
    semantics: newsletterSubscriptionSemantics(),
    addressing: newsletterAddressing(),
    operators: ['is'],
    options: OPTIONS,
    ui: {
        label: 'Newsletter',
        type: 'select',
        searchable: false,
        hideOperatorSelect: true
    }
});
