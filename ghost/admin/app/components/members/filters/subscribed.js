import {MATCH_RELATION_OPTIONS} from './relation-options';

export const SUBSCRIBED_FILTER = ({newsletters, group}) => {
    return {
        label: newsletters.length > 1 ? 'All newsletters' : 'Newsletter subscription',
        name: 'subscribed',
        columnLabel: 'Subscribed',
        relationOptions: MATCH_RELATION_OPTIONS,
        valueType: 'options',
        group: newsletters.length > 1 ? 'Newsletters' : group,
        buildNqlFilter: (flt) => {
            const relation = flt.relation;
            const value = flt.value;

            if (value === 'email-disabled') {
                if (relation === 'is') {
                    return '(email_disabled:1)';
                }
                return '(email_disabled:0)';
            }

            if (relation === 'is') {
                if (value === 'subscribed') {
                    return '(subscribed:true+email_disabled:0)';
                }
                return '(subscribed:false+email_disabled:0)';
            }

            // relation === 'is-not'
            if (value === 'subscribed') {
                return '(subscribed:false,email_disabled:1)';
            }
            return '(subscribed:true,email_disabled:1)';
        },
        parseNqlFilter: (flt) => {
            const comparator = flt.$and || flt.$or; // $or for legacy filter backwards compatibility

            if (!comparator || comparator.length !== 2) {
                const filter = flt;
                if (filter && filter.email_disabled !== undefined) {
                    if (filter.email_disabled) {
                        return {
                            value: 'email-disabled',
                            relation: 'is'
                        };
                    }
                    return {
                        value: 'email-disabled',
                        relation: 'is-not'
                    };
                }
                return;
            }

            if (comparator[0].subscribed === undefined || comparator[1].email_disabled === undefined) {
                return;
            }

            const usedOr = flt.$or !== undefined;
            const subscribed = comparator[0].subscribed;

            if (usedOr) {
                // Is not
                return {
                    value: !subscribed ? 'subscribed' : 'unsubscribed',
                    relation: 'is-not'
                };
            }

            return {
                value: subscribed ? 'subscribed' : 'unsubscribed',
                relation: 'is'
            };
        },
        options: [
            {label: newsletters.length > 1 ? 'Subscribed to at least one' : 'Subscribed', name: 'subscribed'},
            {label: newsletters.length > 1 ? 'Unsubscribed from all' : 'Unsubscribed', name: 'unsubscribed'},
            {label: 'Email disabled', name: 'email-disabled'}
        ],
        getColumnValue: (member) => {
            if (member.emailSuppression && member.emailSuppression.suppressed) {
                return {
                    text: 'Email disabled'
                };
            }

            return member.newsletters.length > 0 ? {
                text: 'Subscribed'
            } : {
                text: 'Unsubscribed'
            };
        }
    };
};

export const NEWSLETTERS_FILTERS = ({newsletters, group}) => {
    if (newsletters.length <= 1) {
        return [];
    }
    return newsletters.map((newsletter) => {
        return {
            label: newsletter.name,
            name: `newsletters.slug:${newsletter.slug}`,
            relationOptions: MATCH_RELATION_OPTIONS,
            group,
            valueType: 'options',
            buildNqlFilter: (flt) => {
                const relation = flt.relation;
                const value = flt.value;

                return (relation === 'is' && value === 'true') || (relation === 'is-not' && value === 'false')
                    ? `(newsletters.slug:${newsletter.slug}+email_disabled:0)`
                    : `(newsletters.slug:-${newsletter.slug},email_disabled:1)`;
            },
            parseNqlFilter: (flt) => {
                const comparator = flt.$and || flt.$or;

                if (!comparator || comparator.length !== 2) {
                    return;
                }

                if (!comparator[0]['newsletters.slug'] || comparator[1].email_disabled === undefined) {
                    return;
                }

                let value = comparator[0]['newsletters.slug'];
                let invert = false;
                if (typeof value === 'object') {
                    if (!value.$ne) {
                        // Unsupported relation type
                        return;
                    }
                    invert = true;
                    value = value.$ne;
                }
                if (value !== newsletter.slug) {
                    // This filter is for a different newsletter
                    return;
                }
                return {
                    value: invert ? 'false' : 'true',
                    relation: 'is'
                };
            },
            options: [
                {label: 'Subscribed', name: 'true'},
                {label: 'Unsubscribed', name: 'false'}
            ],
            columnLabel: newsletter.name,
            getColumnValue: (member, flt) => {
                const relation = flt.relation;
                const value = flt.value;

                if (member.emailSuppression && member.emailSuppression.suppressed) {
                    return {
                        text: 'Email disabled'
                    };
                }

                return {
                    text: (relation === 'is' && value === 'true') || (relation === 'is-not' && value === 'false')
                        ? 'Subscribed'
                        : 'Unsubscribed'
                };
            }
        };
    });
};
