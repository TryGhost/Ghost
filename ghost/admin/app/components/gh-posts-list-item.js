import $ from 'jquery';
import Ember from 'ember';
import Component from 'ember-component';
import {htmlSafe} from 'ember-string';
import computed, {alias, equal} from 'ember-computed';
import injectService from 'ember-service/inject';

import ActiveLinkWrapper from 'ghost-admin/mixins/active-link-wrapper';
import {invokeAction} from 'ember-invoke-action';

// ember-cli-shims doesn't export these
const {ObjectProxy, PromiseProxyMixin} = Ember;

const ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);

export default Component.extend(ActiveLinkWrapper, {
    tagName: 'li',
    classNameBindings: ['isFeatured:featured', 'isPage:page'],

    post: null,
    previewIsHidden: false,

    isFeatured: alias('post.featured'),
    isPage: alias('post.page'),
    isPublished: equal('post.status', 'published'),
    isScheduled: equal('post.status', 'scheduled'),

    ghostPaths: injectService(),
    timeZone: injectService(),

    authorName: computed('post.author.name', 'post.author.email', function () {
        return this.get('post.author.name') || this.get('post.author.email');
    }),

    authorAvatar: computed('post.author.image', function () {
        return this.get('post.author.image') || `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
    }),

    authorAvatarBackground: computed('authorAvatar', function () {
        return htmlSafe(`background-image: url(${this.get('authorAvatar')})`);
    }),

    blogTimezone: computed('timeZone.blogTimezone', function () {
        return ObjectPromiseProxy.create({
            promise: this.get('timeZone.blogTimezone')
        });
    }),

    click() {
        this.sendAction('onClick', this.get('post'));
    },

    doubleClick() {
        this.sendAction('onDoubleClick', this.get('post'));
    },

    didInsertElement() {
        this._super(...arguments);
        this.addObserver('active', this, this.scrollIntoView);
    },

    willDestroyElement() {
        this._super(...arguments);
        this.removeObserver('active', this, this.scrollIntoView);
        if (this.get('post.isDeleted') && this.get('onDelete')) {
            invokeAction(this, 'onDelete');
        }
    },

    scrollIntoView() {
        if (!this.get('active')) {
            return;
        }

        let element = this.$();
        let offset = element.offset().top;
        let elementHeight = element.height();
        let container = $('.js-content-scrollbox');
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
