import Ember from 'ember';
import Component from 'ember-component';
import {htmlSafe} from 'ember-string';
import computed, {alias, equal} from 'ember-computed';
import injectService from 'ember-service/inject';
import $ from 'jquery';
import {isBlank} from 'ember-utils';

// ember-cli-shims doesn't export these
const {Handlebars} = Ember;

export default Component.extend({
    tagName: 'li',
    classNames: ['gh-posts-list-item'],
    classNameBindings: ['active'],

    post: null,
    active: false,

    isFeatured: alias('post.featured'),
    isPage: alias('post.page'),
    isPublished: equal('post.status', 'published'),
    isScheduled: equal('post.status', 'scheduled'),

    ghostPaths: injectService(),

    authorName: computed('post.author.name', 'post.author.email', function () {
        return this.get('post.author.name') || this.get('post.author.email');
    }),

    authorAvatar: computed('post.author.profileImage', function () {
        return this.get('post.author.profileImage') || `${this.get('ghostPaths.assetRoot')}/img/user-image.png`;
    }),

    authorAvatarBackground: computed('authorAvatar', function () {
        let authorAvatar = this.get('authorAvatar');
        let safeUrl = Handlebars.Utils.escapeExpression(authorAvatar);
        return htmlSafe(`background-image: url(${safeUrl})`);
    }),

    // HACK: this is intentionally awful due to time constraints
    // TODO: find a better way to get an excerpt! :)
    subText: computed('post.{html,metaDescription}', function () {
        let html = this.get('post.html');
        let metaDescription = this.get('post.metaDescription');
        let text;

        if (!isBlank(metaDescription)) {
            text = metaDescription;
        } else {
            let $html = $(`<div>${html}</div>`);
            text = $html.text();
        }

        return htmlSafe(`${text.slice(0, 80)}&hellip;`);
    }),

    didReceiveAttrs() {
        if (this.get('active')) {
            this.scrollIntoView();
        }
    },

    click() {
        this.sendAction('onClick', this.get('post'));
    },

    doubleClick() {
        this.sendAction('onDoubleClick', this.get('post'));
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
