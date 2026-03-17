import {defineFields} from './filter-types';
import {describe, expect, it} from 'vitest';
import {scalarNql} from './filter-nql';
import {serializePredicates} from './filter-query-core';
import type {Filter} from '@tryghost/shade';

const fields = defineFields({
    status: {
        operators: ['is', 'is-not'],
        ui: {
            label: 'Status',
            type: 'select'
        },
        ...scalarNql()
    },
    'newsletters.:slug': {
        operators: ['is', 'is-not'],
        ui: {
            label: 'Newsletter',
            type: 'select'
        },
        ...scalarNql()
    }
});

describe('filter-query-core', () => {
    it('serializes filters through resolved fields and drops unresolved ones', () => {
        const filters: Filter[] = [
            {id: '1', field: 'status', operator: 'is', values: ['paid']},
            {id: '2', field: 'newsletters.weekly', operator: 'is-not', values: ['inactive']},
            {id: '3', field: 'unknown', operator: 'is', values: ['test']}
        ];

        expect(serializePredicates(filters, fields, 'UTC')).toBe('newsletters.weekly:-inactive+status:paid');
    });

    it('sorts compiled clauses canonically', () => {
        const filters: Filter[] = [
            {id: '2', field: 'status', operator: 'is', values: ['paid']},
            {id: '1', field: 'newsletters.weekly', operator: 'is', values: ['subscribed']}
        ];

        expect(serializePredicates(filters, fields, 'UTC')).toBe('newsletters.weekly:subscribed+status:paid');
    });
});
