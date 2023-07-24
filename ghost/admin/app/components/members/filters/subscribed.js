import {MATCH_RELATION_OPTIONS} from './relation-options';

export const SUBSCRIBED_FILTER = {
    label: 'Newsletter subscription',
    name: 'subscribed',
    columnLabel: 'Subscribed',
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'options',
    options: [
        {label: 'Subscribed', name: 'true'},
        {label: 'Unsubscribed', name: 'false'}
    ],
    getColumnValue: (member) => {
        return {
            text: member.subscribed ? 'Subscribed' : 'Unsubscribed'
        };
    }
};

export const NEWSLETTERS_FILTER = (newsletterList) => {
    let newsletters = [];
    newsletterList.forEach((newsletter) => {
        const filter = {
            label: newsletter.name,
            name: `newsletters.slug:${newsletter.slug}`,
            relationOptions: MATCH_RELATION_OPTIONS,
            group: 'Newsletters',
            valueType: 'options',
            buildNqlFilter: (flt) => {
                const relation = flt.relation;
                const value = flt.value;

                return (relation === 'is' && value === 'true') || (relation === 'is-not' && value === 'false')
                    ? `newsletters.slug:${newsletter.slug}+email_disabled:0`
                    : `newsletters.slug:-${newsletter.slug},email_disabled:1`;
            },
            parseNqlFilter: (flt) => {
                if (!flt['newsletters.slug']) {
                    return;
                }
                let value = flt['newsletters.slug'];
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
            ]
        };
        newsletters.push(filter);
    });
    return newsletters;
};
