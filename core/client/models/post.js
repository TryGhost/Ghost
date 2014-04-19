/*global Ghost, _, Backbone, JSON */
(function () {
    'use strict';

    Ghost.Models.Post = Ghost.ProgressModel.extend({

        defaults: {
            status: 'draft'
        },

        blacklist: ['published', 'draft'],

        parse: function (resp) {

            if (resp.posts) {
                resp = resp.posts[0];
            }
            if (resp.status) {
                resp.published = resp.status === 'published';
                resp.draft = resp.status === 'draft';
            }
            if (resp.tags) {
                return resp;
            }
            return resp;
        },

        validate: function (attrs) {
            if (_.isEmpty(attrs.title)) {
                return 'You must specify a title for the post.';
            }
        },

        addTag: function (tagToAdd) {
            var tags = this.get('tags') || [];
            tags.push(tagToAdd);
            this.set('tags', tags);
        },

        removeTag: function (tagToRemove) {
            var tags = this.get('tags') || [];
            tags = _.reject(tags, function (tag) {
                return tag.id === tagToRemove.id || tag.name === tagToRemove.name;
            });
            this.set('tags', tags);
        },
        sync: function (method, model, options) {
            //wrap post in {posts: [{...}]}
            if (method === 'create' || method === 'update') {
                options.data = JSON.stringify({posts: [this.attributes]});
                options.contentType = 'application/json';
            }

            return Backbone.Model.prototype.sync.apply(this, arguments);
        }
    });

    Ghost.Collections.Posts = Backbone.Collection.extend({
        currentPage: 1,
        totalPages: 0,
        totalPosts: 0,
        nextPage: 0,
        prevPage: 0,

        url: Ghost.paths.apiRoot + '/posts/',
        model: Ghost.Models.Post,

        parse: function (resp) {
            if (_.isArray(resp.posts)) {
                this.limit = resp.meta.pagination.limit;
                this.currentPage = resp.meta.pagination.page;
                this.totalPages = resp.meta.pagination.pages;
                this.totalPosts = resp.meta.pagination.total;
                this.nextPage = resp.meta.pagination.next;
                this.prevPage = resp.meta.pagination.prev;
                return resp.posts;
            }
            return resp;
        }
    });

}());
