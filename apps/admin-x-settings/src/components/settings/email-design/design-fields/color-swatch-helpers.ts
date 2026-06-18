import {textColorForBackgroundColor} from '@tryghost/color-utils';

const VALID_HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;

const normalizeBackgroundColor = (value: string): string => {
    if (value === 'light') {
        return '#ffffff';
    }

    if (VALID_HEX.test(value)) {
        return value;
    }

    return '#ffffff';
};

export const getAutoSwatchHex = (backgroundColor: string): string => {
    return textColorForBackgroundColor(normalizeBackgroundColor(backgroundColor)).hex();
};
