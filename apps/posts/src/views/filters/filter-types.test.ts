import {defineFields} from './filter-types';
import {describe, expect, expectTypeOf, it} from 'vitest';
import type {CodecContext, FilterCodec, FilterField, ParsedPredicate} from './filter-types';

describe('defineFields', () => {
    it('returns the same object shape at runtime', () => {
        const fields = defineFields({
            status: {
                operators: ['is'],
                ui: {
                    label: 'Status',
                    type: 'select'
                },
                codec: {
                    parse: () => null,
                    serialize: () => null
                }
            }
        });

        expect(fields).toEqual({
            status: {
                operators: ['is'],
                ui: {
                    label: 'Status',
                    type: 'select'
                },
                codec: {
                    parse: expect.any(Function),
                    serialize: expect.any(Function)
                }
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
                codec: {
                    parse: () => null,
                    serialize: () => null
                }
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
                codec: {
                    parse: () => null,
                    serialize: () => null
                }
            }
        });

        expect(Object.keys(fields)).toEqual(['status', 'email']);
        expectTypeOf(fields).toHaveProperty('status');
        expectTypeOf(fields).toHaveProperty('email');
    });
});

describe('filter core types', () => {
    it('exposes the minimal codec context contract', () => {
        expectTypeOf<CodecContext>().toMatchTypeOf<{
            key: string;
            pattern: string;
            params: Record<string, string>;
            timezone: string;
        }>();
    });

    it('keeps predicate ids out of parse-time codec results', () => {
        const codec: FilterCodec = {
            parse: () => {
                const parsed: ParsedPredicate = {
                    field: 'status',
                    operator: 'is',
                    values: ['paid']
                };

                return parsed;
            },
            serialize: () => null
        };

        const parsed = codec.parse({} as never, {
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
        expectTypeOf<ParsedPredicate>().not.toHaveProperty('id');
    });

    it('accepts plain filter field definitions', () => {
        expectTypeOf<FilterField>().toMatchTypeOf<{
            operators: readonly string[];
            ui: {
                label: string;
                type: string;
            };
            codec: FilterCodec;
        }>();
    });
});
