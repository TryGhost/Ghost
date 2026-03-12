import {describe, expect, it} from 'vitest';
import {defineFields} from './filter-types';
import {resolveField} from './resolve-field';

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
    },
    'newsletters.:slug': {
        operators: ['is'],
        ui: {
            label: 'Newsletter',
            type: 'select'
        },
        codec: {
            parse: () => null,
            serialize: () => null
        }
    }
});

describe('resolveField', () => {
    it('resolves exact fields', () => {
        const resolved = resolveField(fields, 'status', 'UTC');

        expect(resolved).toEqual({
            definition: fields.status,
            context: {
                key: 'status',
                pattern: 'status',
                params: {},
                timezone: 'UTC'
            }
        });
    });

    it('resolves pattern fields and extracts params', () => {
        const resolved = resolveField(fields, 'newsletters.weekly', 'Europe/Stockholm');

        expect(resolved).toEqual({
            definition: fields['newsletters.:slug'],
            context: {
                key: 'newsletters.weekly',
                pattern: 'newsletters.:slug',
                params: {
                    slug: 'weekly'
                },
                timezone: 'Europe/Stockholm'
            }
        });
    });

    it('supports serialize-direction lookups for concrete keys', () => {
        const resolved = resolveField(fields, 'newsletters.weekly', 'UTC');

        expect(resolved?.context.pattern).toBe('newsletters.:slug');
        expect(resolved?.context.key).toBe('newsletters.weekly');
    });

    it('returns undefined for unknown fields', () => {
        expect(resolveField(fields, 'unknown', 'UTC')).toBeUndefined();
    });
});
