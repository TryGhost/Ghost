import React from 'react';
import {RelativeDateFilter} from './relative-date-filter';
import type {CustomRendererProps, FilterFieldConfig} from '@tryghost/shade/patterns';

/** Builds the day-count input renderer shown for relative-date operators. */
export function createRelativeDateRenderer(fallbackDate: string): NonNullable<FilterFieldConfig['customRenderer']> {
    const renderer = (props: CustomRendererProps) => React.createElement(RelativeDateFilter, {
        ...props,
        fallbackDate
    });

    return Object.assign(renderer, {displayName: 'RelativeDateRenderer'});
}
