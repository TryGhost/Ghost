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

export const OPTIONS = [
    {label: 'is', name: ''},
    {label: 'is not', name: '-'}
];

export const multipleNewslettersFilter = (newsletterList) => {
    let newsletters = [];
    newsletterList.forEach((newsletter) => {
        const filter = {
            columnLabel: 'Subscribed',
            label: newsletter.name,
            name: `newsletters.slug: ${newsletter.slug}`,
            relationOptions: OPTIONS,
            group: 'Newsletters',
            valueType: 'options',
            buildNqlFilter: (flt) => {
                let query = `newsletters.slug:${flt.relation}${flt.value}`;
                if (query.includes('--')) {
                    query = query.replace('--', '');
                }
                return query;
            },
            options: [
                {label: 'Subscribed', name: `${newsletter.slug}`},
                {label: 'Unsubscribed', name: `-${newsletter.slug}`}
            ],
            getColumnValue: (member) => {
                return {
                    text: member.subscribed ? 'Subscribed' : 'Unsubscribed'
                };
            }
        };
        newsletters.push(filter); 
    });
    return newsletters;
};
