import {commentFields} from './comment-fields';
import {describe, expect, it} from 'vitest';
import type {Filter} from '@tryghost/shade';
import type {NqlContext} from '../filters/filter-types';

const createdAtContext: NqlContext = {
    key: 'created_at',
    pattern: 'created_at',
    params: {},
    timezone: 'UTC'
};

const reportedContext: NqlContext = {
    key: 'reported',
    pattern: 'reported',
    params: {},
    timezone: 'UTC'
};

describe('commentFields', () => {
    it('defines the expected comment field set', () => {
        expect(Object.keys(commentFields)).toEqual([
            'id',
            'status',
            'created_at',
            'body',
            'post',
            'author',
            'reported'
        ]);
    });

    it('keeps the expected static picker config for resource selects', () => {
        expect(commentFields.author).toMatchObject({
            operators: ['is', 'is_not'],
            ui: {
                label: 'Author',
                type: 'select',
                searchable: true,
                className: 'w-80',
                popoverContentClassName: 'w-80'
            }
        });

        expect(commentFields.post).toMatchObject({
            operators: ['is', 'is_not'],
            ui: {
                label: 'Post',
                type: 'select',
                searchable: true,
                className: 'w-full max-w-80',
                popoverContentClassName: 'w-full max-w-[calc(100vw-32px)] max-w-80'
            }
        });
    });

    it('uses local NQL handlers for comment-specific fields', () => {
        expect(commentFields.created_at.toNql).not.toBe(commentFields.status.toNql);
        expect(commentFields.reported.toNql).not.toBe(commentFields.status.toNql);
        expect(commentFields.body.operators).toEqual(['contains', 'not_contains']);
    });
});

describe('commentDateNql', () => {
    it('serializes exact dates as UTC day bounds', () => {
        const filter: Filter = {
            id: '1',
            field: 'created_at',
            operator: 'is',
            values: ['2024-01-01']
        };

        expect(commentFields.created_at.toNql(filter, createdAtContext)).toEqual([
            'created_at:>=\'2024-01-01T00:00:00.000Z\'',
            'created_at:<=\'2024-01-01T23:59:59.999Z\''
        ]);
    });
});

describe('reportedNql', () => {
    it('serializes reported yes/no state', () => {
        expect(commentFields.reported.toNql({
            id: '1',
            field: 'reported',
            operator: 'is',
            values: ['true']
        }, reportedContext)).toEqual(['count.reports:>0']);

        expect(commentFields.reported.toNql({
            id: '2',
            field: 'reported',
            operator: 'is',
            values: ['false']
        }, reportedContext)).toEqual(['count.reports:0']);
    });
});
