import hbs from 'htmlbars-inline-precompile';
import moment from 'moment-timezone';
import {click, find, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Helper: activity-feed-fetcher-test', function () {
    const hooks = setupRenderingTest();
    setupMirage(hooks);

    it('can fetch events', async function () {
        this.server.createList('member-activity-event', 10, {createdAt: moment('2022-11-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')});

        await render(hbs`
            {{#let (activity-feed-fetcher pageSize="2") as |eventsFetcher|}}
                <div class="shown-events">{{eventsFetcher.shownEvents}}</div>
                <div class="total-events">{{eventsFetcher.totalEvents}}</div>
            {{/let}}
        `);

        expect(find('.shown-events')).to.have.trimmed.text('2');
        expect(find('.total-events')).to.have.trimmed.text('10');
    });

    it('can update total/shown amount of events ', async function () {
        this.server.createList('member-activity-event', 5, {createdAt: moment('2022-11-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')});

        await render(hbs`
            {{#let (activity-feed-fetcher pageSize="2") as |eventsFetcher|}}
                <button class="previous" type="button" {{on "click" eventsFetcher.loadPreviousPage}}>Previous page</button>
                <button class="next" type="button" {{on "click" eventsFetcher.loadNextPage}}>Next page</button>

                <div class="shown-events">{{eventsFetcher.shownEvents}}</div>
                <div class="total-events">{{eventsFetcher.totalEvents}}</div>
            {{/let}}
        `);

        const totalEvents = find('.total-events');
        const shownEvents = find('.shown-events');

        expect(shownEvents).to.have.trimmed.text('2');
        expect(totalEvents).to.have.trimmed.text('5');

        // nothing should change if user tries to load previous page on the first one
        await click('.previous');
        expect(shownEvents).to.have.trimmed.text('2');
        expect(totalEvents).to.have.trimmed.text('5');

        // go to the last page
        await click('.next');
        await click('.next');
        expect(shownEvents).to.have.trimmed.text('5');
        expect(totalEvents).to.have.trimmed.text('5');

        // nothing should change if user tries to load next page on the last one
        await click('.next');
        expect(shownEvents).to.have.trimmed.text('5');
        expect(totalEvents).to.have.trimmed.text('5');

        await click('.previous');
        expect(shownEvents).to.have.trimmed.text('4');
        expect(totalEvents).to.have.trimmed.text('5');
    });

    it('can update data for each page', async function () {
        this.server.createList('member-activity-event', 5, {createdAt: moment('2022-11-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')});
        // create event in future to make sure that user don't get events after current date
        this.server.create('member-activity-event', {createdAt: moment().add(1, 'd').format('YYYY-MM-DD HH:mm:ss')});

        await render(hbs`
            {{#let (activity-feed-fetcher pageSize="2") as |eventsFetcher|}}
                <button class="previous" type="button" {{on "click" eventsFetcher.loadPreviousPage}}>Previous page</button>
                <button class="next" type="button" {{on "click" eventsFetcher.loadNextPage}}>Next page</button>

                {{#each eventsFetcher.data as |event|}}
                    <div class="event-id">{{event.data.id}}</div>
                {{/each}}
            {{/let}}
        `);

        expect(findAll('.event-id').length).to.equal(2);
        expect(findAll('.event-id')[0]).to.have.trimmed.text('5');

        await click('.next');
        expect(findAll('.event-id').length).to.equal(2);
        expect(findAll('.event-id')[0]).to.have.trimmed.text('3');

        await click('.next');
        expect(findAll('.event-id').length).to.equal(1);
        expect(findAll('.event-id')[0]).to.have.trimmed.text('1');

        // nothing should change if user tries to load next page on the last one
        await click('.next');
        expect(findAll('.event-id').length).to.equal(1);
        expect(findAll('.event-id')[0]).to.have.trimmed.text('1');

        await click('.previous');
        expect(findAll('.event-id').length).to.equal(2);
        expect(findAll('.event-id')[0]).to.have.trimmed.text('3');

        await click('.previous');
        expect(findAll('.event-id').length).to.equal(2);
        expect(findAll('.event-id')[0]).to.have.trimmed.text('5');

        // nothing should change if user tries to load previous page on the first one
        await click('.previous');
        expect(findAll('.event-id').length).to.equal(2);
        expect(findAll('.event-id')[0]).to.have.trimmed.text('5');
    });

    it('change error state and show error message if fetch was unsuccessful ', async function () {
        this.server.createList('member-activity-event', 10, {createdAt: moment('2022-11-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')});

        await render(hbs`
            {{#let (activity-feed-fetcher pageSize="2") as |eventsFetcher|}}
                <button class="next" type="button" {{on "click" eventsFetcher.loadNextPage}}>Next page</button>

                <div class="error">{{eventsFetcher.isError}}</div>
                <div class="error-message">{{eventsFetcher.errorMessage}}</div>
            {{/let}}
        `);

        expect(find('.error')).to.have.trimmed.text('false');
        expect(find('.error-message')).to.have.trimmed.text('');

        this.server.get(
            '/members/events',
            () => ({errors: [{message: 'Error message'}]}),
            500
        );

        await click('.next');

        expect(find('.error')).to.have.trimmed.text('true');
        expect(find('.error-message')).to.have.trimmed.text('Error message');
    });
});
