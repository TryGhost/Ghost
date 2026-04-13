import {MATCH_RELATION_OPTIONS} from './relation-options';

export const STATUS_FILTER = ({feature, group}) => {
    const options = [
        {label: 'Paid', name: 'paid'},
        {label: 'Free', name: 'free'},
        {label: 'Complimentary', name: 'comped'}
    ];

    if (feature.giftSubscriptions) {
        options.push({label: 'Gift', name: 'gift'});
    }

    return {
        label: 'Member status',
        name: 'status',
        group,
        relationOptions: MATCH_RELATION_OPTIONS,
        valueType: 'options',
        options
    };
};
