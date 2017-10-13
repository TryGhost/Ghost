import Component from '@ember/component';
import SettingsMenuMixin from 'ghost-admin/mixins/settings-menu-component';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import formatMarkdown from 'ghost-admin/utils/format-markdown';
import moment from 'moment';
import {alias, or} from '@ember/object/computed';
import {computed} from '@ember/object';
import {guidFor} from '@ember/object/internals';
import {htmlSafe} from '@ember/string';
import {inject as injectService} from '@ember/service';
import {run} from '@ember/runloop';
import {task, timeout} from 'ember-concurrency';

const PSM_ANIMATION_LENGTH = 400;

export default Component.extend(SettingsMenuMixin, {
    selectedAuthor: null,
    authors: [],

    store: injectService(),
    config: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    slugGenerator: injectService(),
    session: injectService(),
    settings: injectService(),
    ui: injectService(),

    model: null,

    customExcerptScratch: alias('model.customExcerptScratch'),
    codeinjectionFootScratch: alias('model.codeinjectionFootScratch'),
    codeinjectionHeadScratch: alias('model.codeinjectionHeadScratch'),
    metaDescriptionScratch: alias('model.metaDescriptionScratch'),
    metaTitleScratch: alias('model.metaTitleScratch'),
    ogDescriptionScratch: alias('model.ogDescriptionScratch'),
    ogTitleScratch: alias('model.ogTitleScratch'),
    twitterDescriptionScratch: alias('model.twitterDescriptionScratch'),
    twitterTitleScratch: alias('model.twitterTitleScratch'),
    slugValue: boundOneWay('model.slug'),

    facebookDescription: or('ogDescriptionScratch', 'customExcerptScratch', 'seoDescription'),
    facebookImage: or('model.ogImage', 'model.featureImage'),
    facebookTitle: or('ogTitleScratch', 'seoTitle'),
    seoTitle: or('metaTitleScratch', 'model.titleScratch'),
    twitterDescription: or('twitterDescriptionScratch', 'customExcerptScratch', 'seoDescription'),
    twitterImage: or('model.twitterImage', 'model.featureImage'),
    twitterTitle: or('twitterTitleScratch', 'seoTitle'),

    _showSettingsMenu: false,
    _showThrobbers: false,

    didReceiveAttrs() {
        this._super(...arguments);

        this.get('store').query('user', {limit: 'all'}).then((users) => {
            if (!this.get('isDestroyed')) {
                this.set('authors', users.sortBy('name'));
            }
        });

        this.get('model.author').then((author) => {
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
            let post = this.get('model');
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

    twitterImageStyle: computed('twitterImage', function () {
        let image = this.get('twitterImage');
        return htmlSafe(`background-image: url(${image})`);
    }),

    facebookImageStyle: computed('facebookImage', function () {
        let image = this.get('facebookImage');
        return htmlSafe(`background-image: url(${image})`);
    }),

    showThrobbers: task(function* () {
        yield timeout(PSM_ANIMATION_LENGTH);
        this.set('_showThrobbers', true);
    }).restartable(),

    seoDescription: computed('model.scratch', 'metaDescriptionScratch', function () {
        let metaDescription = this.get('metaDescriptionScratch') || '';
        let mobiledoc = this.get('model.scratch');
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

    seoURL: computed('model.slug', 'config.blogUrl', function () {
        let blogUrl = this.get('config.blogUrl');
        let seoSlug = this.get('model.slug') ? this.get('model.slug') : '';
        let seoURL = `${blogUrl}/${seoSlug}`;

        // only append a slash to the URL if the slug exists
        if (seoSlug) {
            seoURL += '/';
        }

        return seoURL;
    }),

    // live-query of all tags for tag input autocomplete
    availableTags: computed(function () {
        return this.get('store').filter('tag', {limit: 'all'}, () => {
            return true;
        });
    }),

    showError(error) {
        // TODO: remove null check once ValidationEngine has been removed
        if (error) {
            this.get('notifications').showAPIError(error);
        }
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
            this.toggleProperty('model.page');

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        toggleFeatured() {
            this.toggleProperty('model.featured');

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save(this.get('saveOptions')).catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
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
                    this.get('model').rollbackAttributes();
                });
        },

        setPublishedAtBlogDate(date) {
            let post = this.get('model');
            let dateString = moment(date).format('YYYY-MM-DD');

            post.get('errors').remove('publishedAtBlogDate');

            if (post.get('isNew') || date === post.get('publishedAtBlogDate')) {
                post.validate({property: 'publishedAtBlog'});
            } else {
                post.set('publishedAtBlogDate', dateString);
                return post.save();
            }
        },

        setPublishedAtBlogTime(time) {
            let post = this.get('model');

            post.get('errors').remove('publishedAtBlogDate');

            if (post.get('isNew') || time === post.get('publishedAtBlogTime')) {
                post.validate({property: 'publishedAtBlog'});
            } else {
                post.set('publishedAtBlogTime', time);
                return post.save();
            }
        },

        setCustomExcerpt(excerpt) {
            let model = this.get('model');
            let currentExcerpt = model.get('customExcerpt');

            if (excerpt === currentExcerpt) {
                return;
            }

            model.set('customExcerpt', excerpt);

            return model.validate({property: 'customExcerpt'}).then(() => {
                return model.save();
            });
        },

        setHeaderInjection(code) {
            let model = this.get('model');
            let currentCode = model.get('codeinjectionHead');

            if (code === currentCode) {
                return;
            }

            model.set('codeinjectionHead', code);

            return model.validate({property: 'codeinjectionHead'}).then(() => {
                return model.save();
            });
        },

        setFooterInjection(code) {
            let model = this.get('model');
            let currentCode = model.get('codeinjectionFoot');

            if (code === currentCode) {
                return;
            }

            model.set('codeinjectionFoot', code);

            return model.validate({property: 'codeinjectionFoot'}).then(() => {
                return model.save();
            });
        },

        setMetaTitle(metaTitle) {
            // Grab the model and current stored meta title
            let model = this.get('model');
            let currentTitle = model.get('metaTitle');

            // If the title entered matches the stored meta title, do nothing
            if (currentTitle === metaTitle) {
                return;
            }

            // If the title entered is different, set it as the new meta title
            model.set('metaTitle', metaTitle);

            // Make sure the meta title is valid and if so, save it into the model
            return model.validate({property: 'metaTitle'}).then(() => {
                if (model.get('isNew')) {
                    return;
                }

                return model.save();
            });
        },

        setMetaDescription(metaDescription) {
            // Grab the model and current stored meta description
            let model = this.get('model');
            let currentDescription = model.get('metaDescription');

            // If the title entered matches the stored meta title, do nothing
            if (currentDescription === metaDescription) {
                return;
            }

            // If the title entered is different, set it as the new meta title
            model.set('metaDescription', metaDescription);

            // Make sure the meta title is valid and if so, save it into the model
            return model.validate({property: 'metaDescription'}).then(() => {
                if (model.get('isNew')) {
                    return;
                }

                return model.save();
            });
        },

        setOgTitle(ogTitle) {
            // Grab the model and current stored facebook title
            let model = this.get('model');
            let currentTitle = model.get('ogTitle');

            // If the title entered matches the stored facebook title, do nothing
            if (currentTitle === ogTitle) {
                return;
            }

            // If the title entered is different, set it as the new facebook title
            model.set('ogTitle', ogTitle);

            // Make sure the facebook title is valid and if so, save it into the model
            return model.validate({property: 'ogTitle'}).then(() => {
                if (model.get('isNew')) {
                    return;
                }

                return model.save();
            });
        },

        setOgDescription(ogDescription) {
            // Grab the model and current stored facebook description
            let model = this.get('model');
            let currentDescription = model.get('ogDescription');

            // If the title entered matches the stored facebook description, do nothing
            if (currentDescription === ogDescription) {
                return;
            }

            // If the description entered is different, set it as the new facebook description
            model.set('ogDescription', ogDescription);

            // Make sure the facebook description is valid and if so, save it into the model
            return model.validate({property: 'ogDescription'}).then(() => {
                if (model.get('isNew')) {
                    return;
                }

                return model.save();
            });
        },

        setTwitterTitle(twitterTitle) {
            // Grab the model and current stored twitter title
            let model = this.get('model');
            let currentTitle = model.get('twitterTitle');

            // If the title entered matches the stored twitter title, do nothing
            if (currentTitle === twitterTitle) {
                return;
            }

            // If the title entered is different, set it as the new twitter title
            model.set('twitterTitle', twitterTitle);

            // Make sure the twitter title is valid and if so, save it into the model
            return model.validate({property: 'twitterTitle'}).then(() => {
                if (model.get('isNew')) {
                    return;
                }

                return model.save();
            });
        },

        setTwitterDescription(twitterDescription) {
            // Grab the model and current stored twitter description
            let model = this.get('model');
            let currentDescription = model.get('twitterDescription');

            // If the description entered matches the stored twitter description, do nothing
            if (currentDescription === twitterDescription) {
                return;
            }

            // If the description entered is different, set it as the new twitter description
            model.set('twitterDescription', twitterDescription);

            // Make sure the twitter description is valid and if so, save it into the model
            return model.validate({property: 'twitterDescription'}).then(() => {
                if (model.get('isNew')) {
                    return;
                }

                return model.save();
            });
        },

        setCoverImage(image) {
            this.set('model.featureImage', image);

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        clearCoverImage() {
            this.set('model.featureImage', '');

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        setOgImage(image) {
            this.set('model.ogImage', image);

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        clearOgImage() {
            this.set('model.ogImage', '');

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        setTwitterImage(image) {
            this.set('model.twitterImage', image);

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        clearTwitterImage() {
            this.set('model.twitterImage', '');

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        changeAuthor(newAuthor) {
            let author = this.get('model.author');
            let model = this.get('model');

            // return if nothing changed
            if (newAuthor.get('id') === author.get('id')) {
                return;
            }

            model.set('author', newAuthor);

            // if this is a new post (never been saved before), don't try to save it
            if (this.get('model.isNew')) {
                return;
            }

            model.save().catch((error) => {
                this.showError(error);
                this.set('selectedAuthor', author);
                model.rollbackAttributes();
            });
        },

        addTag(tagName, index) {
            let currentTags = this.get('model.tags');
            let currentTagNames = currentTags.map((tag) => {
                return tag.get('name').toLowerCase();
            });
            let availableTagNames,
                tagToAdd;

            tagName = tagName.trim();

            // abort if tag is already selected
            if (currentTagNames.includes(tagName.toLowerCase())) {
                return;
            }

            this.get('availableTags').then((availableTags) => {
                availableTagNames = availableTags.map((tag) => {
                    return tag.get('name').toLowerCase();
                });

                // find existing tag or create new
                if (availableTagNames.includes(tagName.toLowerCase())) {
                    tagToAdd = availableTags.find((tag) => {
                        return tag.get('name').toLowerCase() === tagName.toLowerCase();
                    });
                } else {
                    tagToAdd = this.get('store').createRecord('tag', {
                        name: tagName
                    });

                    // we need to set a UUID so that selectize has a unique value
                    // it will be ignored when sent to the server
                    tagToAdd.set('uuid', guidFor(tagToAdd));
                }

                // push tag onto post relationship
                if (tagToAdd) {
                    this.get('model.tags').insertAt(index, tagToAdd);
                }
            });
        },

        removeTag(tag) {
            this.get('model.tags').removeObject(tag);

            if (tag.get('isNew')) {
                tag.destroyRecord();
            }
        },

        deletePost() {
            if (this.get('deletePost')) {
                this.get('deletePost')();
            }
        }
    }
});
