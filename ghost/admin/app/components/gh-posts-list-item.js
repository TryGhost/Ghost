import Ember from 'ember';
import Component from 'ember-component';
import {htmlSafe} from 'ember-string';
import computed, {alias, equal} from 'ember-computed';
import injectService from 'ember-service/inject';

// ember-cli-shims doesn't export these
const {Handlebars, ObjectProxy, PromiseProxyMixin} = Ember;

const ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);

export default Component.extend({
    tagName: 'li',

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

    click() {
        this.sendAction('onClick', this.get('post'));
    },

    doubleClick() {
        this.sendAction('onDoubleClick', this.get('post'));
    }
});
