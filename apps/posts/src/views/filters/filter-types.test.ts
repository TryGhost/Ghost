import {defineFields} from './filter-types';
import {describe, expect, expectTypeOf, it} from 'vitest';
import type {FilterField, FilterFieldNql, NqlContext, UnstampedFilter} from './filter-types';

describe('defineFields', () => {
    it('returns the same object shape at runtime', () => {
        const fields = defineFields({
            status: {
                operators: ['is'],
                ui: {
                    label: 'Status',
                    type: 'select'
                },
                fromNql: () => null,
                toNql: () => null
            }
        });

        expect(fields).toEqual({
            status: {
                operators: ['is'],
                ui: {
                    label: 'Status',
                    type: 'select'
                },
                fromNql: expect.any(Function),
                toNql: expect.any(Function)
            }
        });
    });

    it('supports object spread composition and preserves field keys', () => {
        const baseFields = defineFields({
            status: {
                operators: ['is'],
                ui: {
                    label: 'Status',
                    type: 'select'
                },
                fromNql: () => null,
                toNql: () => null
            }
        });

        const fields = defineFields({
            ...baseFields,
            email: {
                operators: ['contains'],
                ui: {
                    label: 'Email',
                    type: 'text'
                },
                fromNql: () => null,
                toNql: () => null
            }
        });

        expect(Object.keys(fields)).toEqual(['status', 'email']);
        expectTypeOf(fields).toHaveProperty('status');
        expectTypeOf(fields).toHaveProperty('email');
    });
});

describe('filter core types', () => {
    it('exposes the minimal NQL context contract', () => {
        expectTypeOf<NqlContext>().toMatchTypeOf<{
            key: string;
            pattern: string;
            params: Record<string, string>;
            timezone: string;
        }>();
    });

    it('keeps ids out of parse-time compatibility results', () => {
        const fieldNql: FilterFieldNql = {
            fromNql: () => {
                const parsed: UnstampedFilter = {
                    field: 'status',
                    operator: 'is',
                    values: ['paid']
                };

                return parsed;
            },
            toNql: () => null
        };

        const parsed = fieldNql.fromNql?.({} as never, {
            key: 'status',
            pattern: 'status',
            params: {},
            timezone: 'UTC'
        });

        expect(parsed).toEqual({
            field: 'status',
            operator: 'is',
            values: ['paid']
        });
        expect(parsed).not.toHaveProperty('id');
        expectTypeOf<UnstampedFilter>().not.toHaveProperty('id');
    });

    it('accepts plain filter field definitions', () => {
        expectTypeOf<FilterField['operators']>().toMatchTypeOf<readonly string[]>();
        expectTypeOf<FilterField['ui']>().toMatchTypeOf<{
            label: string;
            type: string;
        }>();
        expectTypeOf<FilterField['fromNql']>().toMatchTypeOf<FilterFieldNql['fromNql']>();
        expectTypeOf<FilterField['toNql']>().toMatchTypeOf<FilterFieldNql['toNql']>();
    });
});
