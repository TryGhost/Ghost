import {MATCH_RELATION_OPTIONS} from './relation-options';

export const OFFERS_FILTER = {
    label: 'Offers', 
    name: 'offer_redemptions',
    group: 'Subscription',
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'array'

    // getColumnValue: (offers) => {
    //     console.log(offers);
    //     return {
    //         class: 'gh-members-list-labels',
    //         text: (offers.id ?? []).map(label => label.name).join(', ')
    //     };
    // }
    // options: offerList
};

// export const STATUS_FILTER = {
//     label: 'Member status', 
//     name: 'status', 
//     relationOptions: MATCH_RELATION_OPTIONS,
//     valueType: 'options',
//     options: [
//         {label: 'Paid', name: 'paid'},
//         {label: 'Free', name: 'free'},
//         {label: 'Complimentary', name: 'comped'}
//     ]
// };