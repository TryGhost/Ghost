import Ember from 'ember';
import DS from 'ember-data';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default DS.Model.extend(ValidationEngine, {
    validationType: 'post',

    uuid: DS.attr('string'),
    title: DS.attr('string', {defaultValue: ''}),
    slug: DS.attr('string'),
    markdown: DS.attr('string', {defaultValue: ''}),
    html: DS.attr('string'),
    image: DS.attr('string'),
    featured: DS.attr('boolean', {defaultValue: false}),
    page: DS.attr('boolean', {defaultValue: false}),
    status: DS.attr('string', {defaultValue: 'draft'}),
    language: DS.attr('string', {defaultValue: 'en_US'}),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    author: DS.belongsTo('user',  {async: true}),
    author_id: DS.attr('number'),
    updated_at: DS.attr('moment-date'),
    updated_by: DS.attr(),
    published_at: DS.attr('moment-date'),
    published_by: DS.belongsTo('user', {async: true}),
    created_at: DS.attr('moment-date'),
    created_by: DS.attr(),
    tags: DS.hasMany('tag', {embedded: 'always'}),
    url: DS.attr('string'),

    config: Ember.inject.service(),
    ghostPaths: Ember.inject.service('ghost-paths'),

    absoluteUrl: Ember.computed('url', 'ghostPaths.url', 'config.blogUrl', function () {
        var blogUrl = this.get('config.blogUrl'),
            postUrl = this.get('url');
        return this.get('ghostPaths.url').join(blogUrl, postUrl);
    }),

    previewUrl: Ember.computed('uuid', 'ghostPaths.url', 'config.blogUrl', 'config.routeKeywords.preview', function () {
        var blogUrl = this.get('config.blogUrl'),
            uuid = this.get('uuid'),
            previewKeyword = this.get('config.routeKeywords.preview');
        // New posts don't have a preview
        if (!uuid) {
            return '';
        }
        return this.get('ghostPaths.url').join(blogUrl, previewKeyword, uuid);
    }),

    scratch: null,
    titleScratch: null,

    // Computed post properties

    isPublished: Ember.computed.equal('status', 'published'),
    isDraft: Ember.computed.equal('status', 'draft'),

    // remove client-generated tags, which have `id: null`.
    // Ember Data won't recognize/update them automatically
    // when returned from the server with ids.
    updateTags: function () {
        var tags = this.get('tags'),
            oldTags = tags.filterBy('id', null);

        tags.removeObjects(oldTags);
        oldTags.invoke('deleteRecord');
    },

    isAuthoredByUser: function (user) {
        return parseInt(user.get('id'), 10) === parseInt(this.get('author_id'), 10);
    }

});
