/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import computed, {equal, filterBy} from 'ember-computed';
import injectService from 'ember-service/inject';

import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

// ember-cli-shims doesn't export these so we must get them manually
const {Comparable, compare} = Ember;

function statusCompare(postA, postB) {
    let status1 = postA.get('status');
    let status2 = postB.get('status');

    // if any of those is empty
    if (!status1 && !status2) {
        return 0;
    }

    if (!status1 && status2) {
        return -1;
    }

    if (!status2 && status1) {
        return 1;
    }

    // We have to make sure, that scheduled posts will be listed first
    // after that, draft and published will be sorted alphabetically and don't need
    // any manual comparison.

    if (status1 === 'scheduled' && (status2 === 'draft' || status2 === 'published')) {
        return -1;
    }

    if (status2 === 'scheduled' && (status1 === 'draft' || status1 === 'published')) {
        return 1;
    }

    return compare(status1.valueOf(), status2.valueOf());
}

function publishedAtCompare(postA, postB) {
    let published1 = postA.get('publishedAtUTC');
    let published2 = postB.get('publishedAtUTC');

    if (!published1 && !published2) {
        return 0;
    }

    if (!published1 && published2) {
        return -1;
    }

    if (!published2 && published1) {
        return 1;
    }

    return compare(published1.valueOf(), published2.valueOf());
}

export default Model.extend(Comparable, ValidationEngine, {
    validationType: 'post',

    uuid: attr('string'),
    title: attr('string', {defaultValue: ''}),
    slug: attr('string'),
    markdown: attr('string', {defaultValue: ''}),
    html: attr('string'),
    image: attr('string'),
    featured: attr('boolean', {defaultValue: false}),
    page: attr('boolean', {defaultValue: false}),
    status: attr('string', {defaultValue: 'draft'}),
    language: attr('string', {defaultValue: 'en_US'}),
    metaTitle: attr('string'),
    metaDescription: attr('string'),
    author: belongsTo('user', {async: true}),
    authorId: attr('number'),
    updatedAtUTC: attr('moment-utc'),
    updatedBy: attr(),
    publishedAtUTC: attr('moment-utc'),
    publishedBy: belongsTo('user', {async: true}),
    createdAtUTC: attr('moment-utc'),
    createdBy: attr(),
    tags: hasMany('tag', {
        embedded: 'always',
        async: false
    }),
    url: attr('string'),

    config: injectService(),
    ghostPaths: injectService(),
    timeZone: injectService(),
    clock: injectService(),

    absoluteUrl: computed('url', 'ghostPaths.url', 'config.blogUrl', function () {
        let blogUrl = this.get('config.blogUrl');
        let postUrl = this.get('url');
        return this.get('ghostPaths.url').join(blogUrl, postUrl);
    }),

    previewUrl: computed('uuid', 'ghostPaths.url', 'config.blogUrl', 'config.routeKeywords.preview', function () {
        let blogUrl = this.get('config.blogUrl');
        let uuid = this.get('uuid');
        let previewKeyword = this.get('config.routeKeywords.preview');
        // New posts don't have a preview
        if (!uuid) {
            return '';
        }
        return this.get('ghostPaths.url').join(blogUrl, previewKeyword, uuid);
    }),

    scratch: null,
    titleScratch: null,

    // Computed post properties

    isPublished: equal('status', 'published'),
    isDraft: equal('status', 'draft'),
    internalTags: filterBy('tags', 'isInternal', true),
    isScheduled: equal('status', 'scheduled'),

    // TODO: move this into gh-posts-list-item component
    // Checks every second, if we reached the scheduled date
    timeScheduled: computed('publishedAtUTC', 'clock.second', function () {
        let publishedAtUTC = this.get('publishedAtUTC') || moment.utc(new Date());
        this.get('clock.second');

        return publishedAtUTC.diff(moment.utc(new Date()), 'hours', true) > 0 ? true : false;
    }),

    // remove client-generated tags, which have `id: null`.
    // Ember Data won't recognize/update them automatically
    // when returned from the server with ids.
    // https://github.com/emberjs/data/issues/1829
    updateTags() {
        let tags = this.get('tags');
        let oldTags = tags.filterBy('id', null);

        tags.removeObjects(oldTags);
        oldTags.invoke('deleteRecord');
    },

    isAuthoredByUser(user) {
        return parseInt(user.get('id'), 10) === parseInt(this.get('authorId'), 10);
    },

    // a custom sort function is needed in order to sort the posts list the same way the server would:
    //     status: scheduled, draft, published
    //     publishedAt: DESC
    //     updatedAt: DESC
    //     id: DESC
    compare(postA, postB) {
        let updated1 = postA.get('updatedAtUTC');
        let updated2 = postB.get('updatedAtUTC');
        let idResult,
            publishedAtResult,
            statusResult,
            updatedAtResult;

        // when `updatedAt` is undefined, the model is still
        // being written to with the results from the server
        if (postA.get('isNew') || !updated1) {
            return -1;
        }

        if (postB.get('isNew') || !updated2) {
            return 1;
        }

        idResult = compare(parseInt(postA.get('id')), parseInt(postB.get('id')));
        statusResult = statusCompare(postA, postB);
        updatedAtResult = compare(updated1.valueOf(), updated2.valueOf());
        publishedAtResult = publishedAtCompare(postA, postB);

        if (statusResult === 0) {
            if (publishedAtResult === 0) {
                if (updatedAtResult === 0) {
                    // This should be DESC
                    return idResult * -1;
                }
                // This should be DESC
                return updatedAtResult * -1;
            }
            // This should be DESC
            return publishedAtResult * -1;
        }

        return statusResult;
    }
});
