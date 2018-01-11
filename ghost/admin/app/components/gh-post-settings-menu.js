import Component from '@ember/component';
import SettingsMenuMixin from 'ghost-admin/mixins/settings-menu-component';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import formatMarkdown from 'ghost-admin/utils/format-markdown';
import moment from 'moment';
import {alias, or} from '@ember/object/computed';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const PSM_ANIMATION_LENGTH = 400;

export default Component.extend(SettingsMenuMixin, {
    store: service(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    slugGenerator: service(),
    session: service(),
    settings: service(),
    ui: service(),

    authors: null,
    post: null,
    selectedAuthor: null,

    _showSettingsMenu: false,
    _showThrobbers: false,

    customExcerptScratch: alias('post.customExcerptScratch'),
    codeinjectionFootScratch: alias('post.codeinjectionFootScratch'),
    codeinjectionHeadScratch: alias('post.codeinjectionHeadScratch'),
    metaDescriptionScratch: alias('post.metaDescriptionScratch'),
    metaTitleScratch: alias('post.metaTitleScratch'),
    ogDescriptionScratch: alias('post.ogDescriptionScratch'),
    ogTitleScratch: alias('post.ogTitleScratch'),
    twitterDescriptionScratch: alias('post.twitterDescriptionScratch'),
    twitterTitleScratch: alias('post.twitterTitleScratch'),
    slugValue: boundOneWay('post.slug'),

    facebookDescription: or('ogDescriptionScratch', 'customExcerptScratch', 'seoDescription'),
    facebookImage: or('post.ogImage', 'post.featureImage'),
    facebookTitle: or('ogTitleScratch', 'seoTitle'),
    seoTitle: or('metaTitleScratch', 'post.titleScratch'),
    twitterDescription: or('twitterDescriptionScratch', 'customExcerptScratch', 'seoDescription'),
    twitterImage: or('post.twitterImage', 'post.featureImage'),
    twitterTitle: or('twitterTitleScratch', 'seoTitle'),

    twitterImageStyle: computed('twitterImage', function () {
        let image = this.get('twitterImage');
        return htmlSafe(`background-image: url(${image})`);
    }),

    facebookImageStyle: computed('facebookImage', function () {
        let image = this.get('facebookImage');
        return htmlSafe(`background-image: url(${image})`);
    }),

    seoDescription: computed('post.scratch', 'metaDescriptionScratch', function () {
        let metaDescription = this.get('metaDescriptionScratch') || '';
        let mobiledoc = this.get('post.scratch');
        let markdown = mobiledoc.cards && mobiledoc.cards[0][1].markdown;
        let placeholder;

        if (metaDescription) {
            placeholder = metaDescription;
        } else {
            let div = document.createElement('div');
            div.innerHTML = formatMarkdown(markdown, false);

            // Strip HTML
            placeholder = div.textContent;
            // Replace new lines and trim
            placeholder = placeholder.replace(/\n+/g, ' ').trim();
        }

        return placeholder;
    }),

    seoURL: computed('post.slug', 'config.blogUrl', function () {
        let blogUrl = this.get('config.blogUrl');
        let seoSlug = this.get('post.slug') ? this.get('post.slug') : '';
        let seoURL = `${blogUrl}/${seoSlug}`;

        // only append a slash to the URL if the slug exists
        if (seoSlug) {
            seoURL += '/';
        }

        return seoURL;
    }),

    init() {
        this._super(...arguments);
        this.authors = this.authors || [];
    },

    didReceiveAttrs() {
        this._super(...arguments);

        this.get('store').query('user', {limit: 'all'}).then((users) => {
            if (!this.get('isDestroyed')) {
                this.set('authors', users.sortBy('name'));
            }
        });

        this.get('post.author').then((author) => {
            this.set('selectedAuthor', author);
        });

        // HACK: ugly method of working around the CSS animations so that we
        // can add throbbers only when the animation has finished
        // TODO: use liquid-fire to handle PSM slide-in and replace tabs manager
        // with something more ember-like
        if (this.get('showSettingsMenu') && !this._showSettingsMenu) {
            this.get('showThrobbers').perform();
        }

        // fired when menu is closed
        if (!this.get('showSettingsMenu') && this._showSettingsMenu) {
            let post = this.get('post');
            let errors = post.get('errors');

            // reset the publish date if it has an error
            if (errors.has('publishedAtBlogDate') || errors.has('publishedAtBlogTime')) {
                post.set('publishedAtBlogTZ', post.get('publishedAtUTC'));
                post.validate({attribute: 'publishedAtBlog'});
            }

            // remove throbbers
            this.set('_showThrobbers', false);
        }

        this._showSettingsMenu = this.get('showSettingsMenu');
    },

    actions: {
        showSubview(subview) {
            this._super(...arguments);

            this.set('subview', subview);

            // Chrome appears to have an animation bug that cancels the slide
            // transition unless there's a delay between the animation starting
            // and the throbbers being removed
            run.later(this, function () {
                this.set('_showThrobbers', false);
            }, 50);
        },

        closeSubview() {
            this._super(...arguments);

            this.set('subview', null);
            this.get('showThrobbers').perform();
        },

        discardEnter() {
            return false;
        },

        togglePage() {
            this.toggleProperty('post.page');

            // If this is a new post.  Don't save the post.  Defer the save
            // to the user pressing the save button
            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        toggleFeatured() {
            this.toggleProperty('post.featured');

            // If this is a new post.  Don't save the post.  Defer the save
            // to the user pressing the save button
            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        /**
         * triggered by user manually changing slug
         */
        updateSlug(newSlug) {
            return this.get('updateSlug')
                .perform(newSlug)
                .catch((error) => {
                    this.showError(error);
                    this.get('post').rollbackAttributes();
                });
        },

        setPublishedAtBlogDate(date) {
            let post = this.get('post');
            let dateString = moment(date).format('YYYY-MM-DD');

            post.get('errors').remove('publishedAtBlogDate');

            if (post.get('isNew') || date === post.get('publishedAtBlogDate')) {
                post.validate({property: 'publishedAtBlog'});
            } else {
                post.set('publishedAtBlogDate', dateString);
                return this.get('savePost').perform();
            }
        },

        setPublishedAtBlogTime(time) {
            let post = this.get('post');

            post.get('errors').remove('publishedAtBlogDate');

            if (post.get('isNew') || time === post.get('publishedAtBlogTime')) {
                post.validate({property: 'publishedAtBlog'});
            } else {
                post.set('publishedAtBlogTime', time);
                return this.get('savePost').perform();
            }
        },

        setCustomExcerpt(excerpt) {
            let post = this.get('post');
            let currentExcerpt = post.get('customExcerpt');

            if (excerpt === currentExcerpt) {
                return;
            }

            post.set('customExcerpt', excerpt);

            return post.validate({property: 'customExcerpt'}).then(() => this.get('savePost').perform());
        },

        setHeaderInjection(code) {
            let post = this.get('post');
            let currentCode = post.get('codeinjectionHead');

            if (code === currentCode) {
                return;
            }

            post.set('codeinjectionHead', code);

            return post.validate({property: 'codeinjectionHead'}).then(() => this.get('savePost').perform());
        },

        setFooterInjection(code) {
            let post = this.get('post');
            let currentCode = post.get('codeinjectionFoot');

            if (code === currentCode) {
                return;
            }

            post.set('codeinjectionFoot', code);

            return post.validate({property: 'codeinjectionFoot'}).then(() => this.get('savePost').perform());
        },

        setMetaTitle(metaTitle) {
            // Grab the post and current stored meta title
            let post = this.get('post');
            let currentTitle = post.get('metaTitle');

            // If the title entered matches the stored meta title, do nothing
            if (currentTitle === metaTitle) {
                return;
            }

            // If the title entered is different, set it as the new meta title
            post.set('metaTitle', metaTitle);

            // Make sure the meta title is valid and if so, save it into the post
            return post.validate({property: 'metaTitle'}).then(() => {
                if (post.get('isNew')) {
                    return;
                }

                return this.get('savePost').perform();
            });
        },

        setMetaDescription(metaDescription) {
            // Grab the post and current stored meta description
            let post = this.get('post');
            let currentDescription = post.get('metaDescription');

            // If the title entered matches the stored meta title, do nothing
            if (currentDescription === metaDescription) {
                return;
            }

            // If the title entered is different, set it as the new meta title
            post.set('metaDescription', metaDescription);

            // Make sure the meta title is valid and if so, save it into the post
            return post.validate({property: 'metaDescription'}).then(() => {
                if (post.get('isNew')) {
                    return;
                }

                return this.get('savePost').perform();
            });
        },

        setOgTitle(ogTitle) {
            // Grab the post and current stored facebook title
            let post = this.get('post');
            let currentTitle = post.get('ogTitle');

            // If the title entered matches the stored facebook title, do nothing
            if (currentTitle === ogTitle) {
                return;
            }

            // If the title entered is different, set it as the new facebook title
            post.set('ogTitle', ogTitle);

            // Make sure the facebook title is valid and if so, save it into the post
            return post.validate({property: 'ogTitle'}).then(() => {
                if (post.get('isNew')) {
                    return;
                }

                return this.get('savePost').perform();
            });
        },

        setOgDescription(ogDescription) {
            // Grab the post and current stored facebook description
            let post = this.get('post');
            let currentDescription = post.get('ogDescription');

            // If the title entered matches the stored facebook description, do nothing
            if (currentDescription === ogDescription) {
                return;
            }

            // If the description entered is different, set it as the new facebook description
            post.set('ogDescription', ogDescription);

            // Make sure the facebook description is valid and if so, save it into the post
            return post.validate({property: 'ogDescription'}).then(() => {
                if (post.get('isNew')) {
                    return;
                }

                return this.get('savePost').perform();
            });
        },

        setTwitterTitle(twitterTitle) {
            // Grab the post and current stored twitter title
            let post = this.get('post');
            let currentTitle = post.get('twitterTitle');

            // If the title entered matches the stored twitter title, do nothing
            if (currentTitle === twitterTitle) {
                return;
            }

            // If the title entered is different, set it as the new twitter title
            post.set('twitterTitle', twitterTitle);

            // Make sure the twitter title is valid and if so, save it into the post
            return post.validate({property: 'twitterTitle'}).then(() => {
                if (post.get('isNew')) {
                    return;
                }

                return this.get('savePost').perform();
            });
        },

        setTwitterDescription(twitterDescription) {
            // Grab the post and current stored twitter description
            let post = this.get('post');
            let currentDescription = post.get('twitterDescription');

            // If the description entered matches the stored twitter description, do nothing
            if (currentDescription === twitterDescription) {
                return;
            }

            // If the description entered is different, set it as the new twitter description
            post.set('twitterDescription', twitterDescription);

            // Make sure the twitter description is valid and if so, save it into the post
            return post.validate({property: 'twitterDescription'}).then(() => {
                if (post.get('isNew')) {
                    return;
                }

                return this.get('savePost').perform();
            });
        },

        setCoverImage(image) {
            this.set('post.featureImage', image);

            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        clearCoverImage() {
            this.set('post.featureImage', '');

            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        setOgImage(image) {
            this.set('post.ogImage', image);

            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        clearOgImage() {
            this.set('post.ogImage', '');

            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        setTwitterImage(image) {
            this.set('post.twitterImage', image);

            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        clearTwitterImage() {
            this.set('post.twitterImage', '');

            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.get('post').rollbackAttributes();
            });
        },

        changeAuthor(newAuthor) {
            let author = this.get('post.author');
            let post = this.get('post');

            // return if nothing changed
            if (newAuthor.get('id') === author.get('id')) {
                return;
            }

            post.set('author', newAuthor);

            // if this is a new post (never been saved before), don't try to save it
            if (this.get('post.isNew')) {
                return;
            }

            this.get('savePost').perform().catch((error) => {
                this.showError(error);
                this.set('selectedAuthor', author);
                post.rollbackAttributes();
            });
        },

        deletePost() {
            if (this.get('deletePost')) {
                this.get('deletePost')();
            }
        }
    },

    showThrobbers: task(function* () {
        yield timeout(PSM_ANIMATION_LENGTH);
        this.set('_showThrobbers', true);
    }).restartable(),

    showError(error) {
        // TODO: remove null check once ValidationEngine has been removed
        if (error) {
            this.get('notifications').showAPIError(error);
        }
    }
});
