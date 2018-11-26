import $ from 'jquery';
import Component from '@ember/component';
import {alias, equal} from '@ember/object/computed';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

export default Component.extend({
    ghostPaths: service(),

    tagName: 'li',
    classNames: ['gh-posts-list-item'],
    classNameBindings: ['active'],

    post: null,
    active: false,

    // closure actions
    onClick() {},
    onDoubleClick() {},

    isFeatured: alias('post.featured'),
    isPage: alias('post.page'),
    isDraft: equal('post.status', 'draft'),
    isPublished: equal('post.status', 'published'),
    isScheduled: equal('post.status', 'scheduled'),

    authorNames: computed('post.authors.[]', function () {
        let authors = this.get('post.authors');

        return authors.map(author => author.get('name') || author.get('email')).join(', ');
    }),

    subText: computed('post.{plaintext,customExcerpt,metaDescription}', function () {
        let text = this.get('post.plaintext') || '';
        let customExcerpt = this.get('post.customExcerpt');
        let metaDescription = this.get('post.metaDescription');

        if (!isBlank(customExcerpt)) {
            text = customExcerpt;
        } else if (!isBlank(metaDescription)) {
            text = metaDescription;
        }

        return `${text.slice(0, 80)}...`;
    }),

    didReceiveAttrs() {
        if (this.get('active')) {
            this.scrollIntoView();
        }
    },

    click() {
        this.onClick(this.get('post'));
    },

    doubleClick() {
        this.onDoubleClick(this.get('post'));
    },

    scrollIntoView() {
        let element = this.$();
        let offset = element.offset().top;
        let elementHeight = element.height();
        let container = $('.content-list');
        let containerHeight = container.height();
        let currentScroll = container.scrollTop();
        let isBelowTop, isAboveBottom, isOnScreen;

        isAboveBottom = offset < containerHeight;
        isBelowTop = offset > elementHeight;

        isOnScreen = isBelowTop && isAboveBottom;

        if (!isOnScreen) {
            // Scroll so that element is centered in container
            // 40 is the amount of padding on the container
            container.clearQueue().animate({
                scrollTop: currentScroll + offset - 40 - containerHeight / 2
            });
        }
    }
});
