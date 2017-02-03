import Ember from 'ember';
import Component from 'ember-component';
import {htmlSafe} from 'ember-string';
import computed, {alias, equal} from 'ember-computed';
import injectService from 'ember-service/inject';
import $ from 'jquery';
import {isBlank} from 'ember-utils';

// ember-cli-shims doesn't export these
const {Handlebars, ObjectProxy, PromiseProxyMixin} = Ember;

const ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);

export default Component.extend({
    tagName: 'li',
    classNames: ['gh-posts-list-item'],

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
        return this.get('post.author.image') || `${this.get('ghostPaths.assetRoot')}/img/user-image.png`;
    }),

    authorAvatarBackground: computed('authorAvatar', function () {
        let authorAvatar = this.get('authorAvatar');
        let safeUrl = Handlebars.Utils.escapeExpression(authorAvatar);
        return htmlSafe(`background-image: url(${safeUrl})`);
    }),

    blogTimezone: computed('timeZone.blogTimezone', function () {
        return ObjectPromiseProxy.create({
            promise: this.get('timeZone.blogTimezone')
        });
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

    click() {
        this.sendAction('onClick', this.get('post'));
    },

    doubleClick() {
        this.sendAction('onDoubleClick', this.get('post'));
    }
});
