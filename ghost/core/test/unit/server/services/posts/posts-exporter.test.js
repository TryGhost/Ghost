const PostsExporter = require('../../../../../core/server/services/posts/posts-exporter');
const assert = require('node:assert/strict');

describe('PostsExporter', function () {
    it('Can construct class', function () {
        new PostsExporter({});
    });

    describe('mapPostStatus', function () {
        const exporter = new PostsExporter({});

        it('Returns draft', function () {
            assert.equal(
                exporter.mapPostStatus('draft', false),
                'draft'
            );
        });

        it('Returns scheduled', function () {
            assert.equal(
                exporter.mapPostStatus('scheduled', false),
                'scheduled'
            );
        });

        it('Returns emailed only', function () {
            assert.equal(
                exporter.mapPostStatus('sent', false),
                'emailed only'
            );
        });

        it('Returns published and emailed', function () {
            assert.equal(
                exporter.mapPostStatus('published', true),
                'published and emailed'
            );
        });

        it('Returns published only', function () {
            assert.equal(
                exporter.mapPostStatus('published', false),
                'published only'
            );
        });

        it('Returns unsupported', function () {
            assert.equal(
                exporter.mapPostStatus('unsupported', false),
                'unsupported'
            );
        });
    });

    describe('humanReadableEmailRecipientFilter', function () {
        const exporter = new PostsExporter({});
        let labels;
        let tiers;

        beforeEach(function () {
            labels = [
                {slug: 'imported', name: 'Imported'},
                {slug: 'vip', name: 'VIP'}
            ];
            tiers = [
                {slug: 'silver', name: 'Silver'},
                {slug: 'gold', name: 'Gold'}
            ];
        });

        it('Returns all', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('all'),
                'All subscribers'
            );
        });

        it('Returns empty', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter(''),
                ''
            );
        });

        it('Returns labels', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('label:imported', labels, tiers),
                'Imported'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('label:imported,label:vip', labels, tiers),
                'Imported, VIP'
            );
        });

        it('Returns invalid labels', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('label:invalidone', labels, tiers),
                'invalidone'
            );
        });

        it('Returns tiers', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('tier:silver', labels, tiers),
                'Silver'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('tier:silver,tier:gold', labels, tiers),
                'Silver, Gold'
            );
        });

        it('Returns invalid tiers', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('tier:invalidone', labels, tiers),
                'invalidone'
            );
        });

        it('Returns status', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:free'),
                'Free subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:-free'),
                'Paid subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:paid'),
                'Paid subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:comped'),
                'Complimentary subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:-paid'),
                'Free subscribers'
            );
        });

        it('Ignores AND', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:free+status:paid', labels, tiers),
                ''
            );
        });

        it('Single brackets filter', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('(status:free)', labels, tiers),
                'Free subscribers'
            );
        });

        it('Ignores invalid filters', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('sdgsdgsdg sdg sdg sdgs dgs', labels, tiers),
                'sdgsdgsdg sdg sdg sdgs dgs'
            );
        });
    });
});
