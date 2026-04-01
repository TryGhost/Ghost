import nql from '@tryghost/nql-lang';
import {commentFields} from '@src/views/comments/comment-fields';
import {describe, expect, it} from 'vitest';
import type {CodecContext, FilterPredicate} from '@src/views/filters/filter-types';

const createdAtContext: CodecContext = {
    key: 'created_at',
    pattern: 'created_at',
    params: {},
    timezone: 'UTC'
};

const reportedContext: CodecContext = {
    key: 'reported',
    pattern: 'reported',
    params: {},
    timezone: 'UTC'
};

const bodyContext: CodecContext = {
    key: 'body',
    pattern: 'body',
    params: {},
    timezone: 'UTC'
};

describe('commentFields', () => {
    it('defines the expected comment field set', () => {
        expect(Object.keys(commentFields)).toEqual([
            'status',
            'created_at',
            'body',
            'post',
            'author',
            'reported'
        ]);
    });

    it('keeps the expected operators for key comment fields', () => {
        expect(commentFields.status.operators).toEqual(['is']);
        expect(commentFields.created_at.operators).toEqual(['is', 'before', 'after']);
        expect(commentFields.body.operators).toEqual(['contains', 'does-not-contain']);
        expect(commentFields.post.operators).toEqual(['is', 'is-not']);
        expect(commentFields.author.operators).toEqual(['is', 'is-not']);
        expect(commentFields.reported.operators).toEqual(['is']);
    });

    it('keeps parse aliases local to mapped comment fields', () => {
        expect(commentFields.body.parseKeys).toEqual(['html']);
        expect(commentFields.post.parseKeys).toEqual(['post_id']);
        expect(commentFields.author.parseKeys).toEqual(['member_id']);
        expect(commentFields.reported.parseKeys).toEqual(['count.reports']);
    });

    describe('commentDateCodec', () => {
        it('serializes exact dates as UTC day bounds', () => {
            const predicate: FilterPredicate = {
                id: '1',
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            };

            expect(commentFields.created_at.codec.serialize(predicate, createdAtContext)).toEqual([
                'created_at:>=\'2024-01-01T00:00:00.000Z\'',
                'created_at:<=\'2024-01-01T23:59:59.999Z\''
            ]);
        });

        it('parses simple before/after comparators back to local dates', () => {
            expect(commentFields.created_at.codec.parse(
                nql.parse('created_at:<\'2024-01-03T00:00:00.000Z\'') as never,
                createdAtContext
            )).toEqual({
                field: 'created_at',
                operator: 'before',
                values: ['2024-01-03']
            });

            expect(commentFields.created_at.codec.parse(
                nql.parse('created_at:>\'2024-01-01T23:59:59.999Z\'') as never,
                createdAtContext
            )).toEqual({
                field: 'created_at',
                operator: 'after',
                values: ['2024-01-01']
            });
        });
    });

    describe('reportedCodec', () => {
        it('serializes reported yes/no state', () => {
            expect(commentFields.reported.codec.serialize({
                id: '1',
                field: 'reported',
                operator: 'is',
                values: ['true']
            }, reportedContext)).toEqual(['count.reports:>0']);

            expect(commentFields.reported.codec.serialize({
                id: '2',
                field: 'reported',
                operator: 'is',
                values: ['false']
            }, reportedContext)).toEqual(['count.reports:0']);
        });

        it('parses count-based report filters into boolean values', () => {
            expect(commentFields.reported.codec.parse(
                nql.parse('count.reports:>0') as never,
                reportedContext
            )).toEqual({
                field: 'reported',
                operator: 'is',
                values: ['true']
            });

            expect(commentFields.reported.codec.parse(
                nql.parse('count.reports:0') as never,
                reportedContext
            )).toEqual({
                field: 'reported',
                operator: 'is',
                values: ['false']
            });
        });
    });

    describe('mapped shared codecs', () => {
        it('uses the shared text codec with the html field override', () => {
            expect(commentFields.body.codec.serialize({
                id: '1',
                field: 'body',
                operator: 'does-not-contain',
                values: ['ghost']
            }, bodyContext)).toEqual(['html:-~\'ghost\'']);
        });
    });
});
