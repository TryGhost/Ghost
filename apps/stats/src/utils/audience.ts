import {ALL_AUDIENCES, AUDIENCE_BITS, AUDIENCE_TYPES} from './constants';

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
