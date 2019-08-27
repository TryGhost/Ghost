import Component from '@ember/component';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    ghostPaths: service(),
    notifications: service(),
    router: service(),

    tagName: 'li',
    classNames: ['gh-list-row', 'gh-tags-list-item'],

    active: false,

    id: alias('tag.id'),
    slug: alias('tag.slug'),
    name: alias('tag.name'),
    isInternal: alias('tag.isInternal'),
    description: alias('tag.description'),
    postsCount: alias('tag.count.posts'),
    postsLabel: computed('tag.count.posts', function () {
        let noOfPosts = this.postsCount || 0;
        return (noOfPosts === 1) ? `${noOfPosts} post` : `${noOfPosts} posts`;
    }),

    _deleteTag() {
        let tag = this.tag;

        return tag.destroyRecord().then(() => {}, (error) => {
            this._deleteTagFailure(error);
        });
    },

    _deleteTagFailure(error) {
        this.notifications.showAPIError(error, {key: 'tag.delete'});
    }
});
