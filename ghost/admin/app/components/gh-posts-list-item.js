import Component from '@ember/component';
import {alias, equal} from '@ember/object/computed';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

export default Component.extend({
    ghostPaths: service(),

    tagName: 'li',
    classNames: ['gh-list-row', 'gh-posts-list-item'],

    post: null,

    isFeatured: alias('post.featured'),
    isPage: alias('post.page'),
    isDraft: equal('post.status', 'draft'),
    isPublished: equal('post.status', 'published'),
    isScheduled: equal('post.status', 'scheduled'),

    authorNames: computed('post.authors.[]', function () {
        let authors = this.get('post.authors');

        return authors.map(author => author.get('name') || author.get('email')).join(', ');
    }),

    subText: computed('post.{excerpt,customExcerpt,metaDescription}', function () {
        let text = this.get('post.excerpt') || '';
        let customExcerpt = this.get('post.customExcerpt');
        let metaDescription = this.get('post.metaDescription');

        if (!isBlank(customExcerpt)) {
            text = customExcerpt;
        } else if (!isBlank(metaDescription)) {
            text = metaDescription;
        }

        if (this.isScheduled) {
            return `${text.slice(0, 40)}...`;
        } else {
            return `${text.slice(0, 80)}...`;
        }
    })
});
