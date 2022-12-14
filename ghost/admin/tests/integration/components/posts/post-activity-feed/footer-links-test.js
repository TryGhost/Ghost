import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {hbs} from 'ember-cli-htmlbars';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: posts/post-activity-feed/footer-links', function () {
    setupRenderingTest();

    it('renders just one link if negative feedback > 0', async function () {
        this.set('post', {id: 'id', count: {positive_feedback: 0, negative_feedback: 1}});
        await render(hbs`
            <Posts::PostActivityFeed::FooterLinks
                @eventType="feedback"
                @post={{this.post}}
            />`);

        const link = find('.gh-post-activity-feed-pagination-link-wrapper');

        expect(link).to.contain.text('Less like this');
        expect(link).not.to.contain.text('and');
        expect(link).not.to.contain.text('More like this');
    });

    it('renders just one link if positive feedback > 0', async function () {
        this.set('post', {id: 'id', count: {positive_feedback: 1, negative_feedback: 0}});
        await render(hbs`
            <Posts::PostActivityFeed::FooterLinks
                @eventType="feedback"
                @post={{this.post}}
            />`);

        const link = find('.gh-post-activity-feed-pagination-link-wrapper');

        expect(link).not.to.contain.text('Less like this');
        expect(link).not.to.contain.text('and');
        expect(link).to.contain.text('More like this');
    });

    it('renders positive and negative links with separator', async function () {
        this.set('post', {id: 'id', count: {positive_feedback: 1, negative_feedback: 1}});
        await render(hbs`
            <Posts::PostActivityFeed::FooterLinks
                @eventType="feedback"
                @post={{this.post}}
            />`);

        const link = find('.gh-post-activity-feed-pagination-link-wrapper');

        expect(link).to.contain.text('Less like this');
        expect(link).to.contain.text('and');
        expect(link).to.contain.text('More like this');
    });
});
