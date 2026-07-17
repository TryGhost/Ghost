import {formatNumber} from '@tryghost/shade/utils';

export const formatRate = (rate: number | null): string => (
    rate === null ? '--' : `${formatNumber(rate)}%`
);
