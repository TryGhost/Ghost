import {AUDIENCE_BITS} from '@src/utils/constants';

export const AUDIENCE_TYPES = [
    {name: 'Public visitors', value: 'undefined', bit: AUDIENCE_BITS.PUBLIC},
    {name: 'Free members', value: 'free', bit: AUDIENCE_BITS.FREE},
    {name: 'Paid members', value: 'paid', bit: AUDIENCE_BITS.PAID}
];

// Default: all audiences selected (binary 111 = 7)
export const ALL_AUDIENCES = AUDIENCE_BITS.PUBLIC | AUDIENCE_BITS.FREE | AUDIENCE_BITS.PAID;

/**
 * Derive audience bitmask from filter values
 * If no filter values provided, returns ALL_AUDIENCES
 */
export const getAudienceFromFilterValues = (filterValues: string[] | undefined): number => {
    if (!filterValues || filterValues.length === 0) {
        return ALL_AUDIENCES;
    }

    return AUDIENCE_TYPES
        .filter(opt => filterValues.includes(opt.value))
        .reduce((acc, opt) => acc | opt.bit, 0) || ALL_AUDIENCES;
};

export const getAudienceQueryParam = (audience: number) => {
    const selectedValues = [];

    if ((audience & AUDIENCE_BITS.PUBLIC) !== 0) {
        selectedValues.push(AUDIENCE_TYPES[0].value);
    }
    if ((audience & AUDIENCE_BITS.FREE) !== 0) {
        selectedValues.push(AUDIENCE_TYPES[1].value);
    }
    if ((audience & AUDIENCE_BITS.PAID) !== 0) {
        selectedValues.push(AUDIENCE_TYPES[2].value);
    }

    return selectedValues.join(',');
};
