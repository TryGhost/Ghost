/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Models.Post = Ghost.ProgressModel.extend({

        defaults: {
            status: 'draft'
        },

        blacklist: ['published', 'draft'],

        parse: function (resp) {
            if (resp.status) {
                resp.published = resp.status === 'published';
                resp.draft = resp.status === 'draft';
            }
            if (resp.tags) {
                // TODO: parse tags into it's own collection on the model (this.tags)
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
                this.limit = resp.limit;
                this.currentPage = resp.page;
                this.totalPages = resp.pages;
                this.totalPosts = resp.total;
                this.nextPage = resp.next;
                this.prevPage = resp.prev;
                return resp.posts;
            }
            return resp;
        }
    });

}());
