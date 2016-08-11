import $ from 'jquery';
import Ember from 'ember';
import Controller from 'ember-controller';
import computed from 'ember-computed';
import {guidFor} from 'ember-metal/utils';
import injectService from 'ember-service/inject';
import injectController from 'ember-controller/inject';
import {htmlSafe} from 'ember-string';
import observer from 'ember-metal/observer';

import {parseDateString} from 'ghost-admin/utils/date-formatting';
import SettingsMenuMixin from 'ghost-admin/mixins/settings-menu-controller';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import isNumber from 'ghost-admin/utils/isNumber';

const {ArrayProxy, Handlebars, PromiseProxyMixin} = Ember;

export default Controller.extend(SettingsMenuMixin, {
    selectedAuthor: null,

    application: injectController(),
    config: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    timeZone: injectService(),

    initializeSelectedAuthor: observer('model', function () {
        return this.get('model.author').then((author) => {
            this.set('selectedAuthor', author);
            return author;
        });
    }),

    authors: computed(function () {
        // Loaded asynchronously, so must use promise proxies.
        let deferred = {};

        deferred.promise = this.store.query('user', {limit: 'all'}).then((users) => {
            return users.rejectBy('id', 'me').sortBy('name');
        }).then((users) => {
            return users.filter((user) => {
                return user.get('active');
            });
        });

        return ArrayProxy
            .extend(PromiseProxyMixin)
            .create(deferred);
    }),

    slugValue: boundOneWay('model.slug'),
    metaTitleScratch: boundOneWay('model.metaTitle'),
    metaDescriptionScratch: boundOneWay('model.metaDescription'),

    seoTitle: computed('model.titleScratch', 'metaTitleScratch', function () {
        let metaTitle = this.get('metaTitleScratch') || '';

        metaTitle = metaTitle.length > 0 ? metaTitle : this.get('model.titleScratch');

        if (metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = htmlSafe(`${metaTitle}&hellip;`);
        }

        return metaTitle;
    }),

    seoDescription: computed('model.scratch', 'metaDescriptionScratch', function () {
        let metaDescription = this.get('metaDescriptionScratch') || '';
        let html = '';
        let el, placeholder;

        if (metaDescription.length > 0) {
            placeholder = metaDescription;
        } else {
            el = $('.rendered-markdown');

            // Get rendered markdown
            if (el !== undefined && el.length > 0) {
                html = el.clone();
                html.find('.js-drop-zone').remove();
                html = html[0].innerHTML;
            }

            // Strip HTML
            placeholder = $('<div />', {html}).text();
            // Replace new lines and trim
            placeholder = placeholder.replace(/\n+/g, ' ').trim();
        }

        if (placeholder.length > 156) {
            // Limit to 156 characters
            placeholder = placeholder.substring(0, 156).trim();
            placeholder = Handlebars.Utils.escapeExpression(placeholder);
            placeholder = htmlSafe(`${placeholder}&hellip;`);
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

        if (seoURL.length > 70) {
            seoURL = seoURL.substring(0, 70).trim();
            seoURL = htmlSafe(`${seoURL}&hellip;`);
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
            let slug = this.get('model.slug');

            newSlug = newSlug || slug;
            newSlug = newSlug && newSlug.trim();

            // Ignore unchanged slugs or candidate slugs that are empty
            if (!newSlug || slug === newSlug) {
                // reset the input to its previous state
                this.set('slugValue', slug);

                return;
            }

            this.get('slugGenerator').generateSlug('post', newSlug).then((serverSlug) => {
                // If after getting the sanitized and unique slug back from the API
                // we end up with a slug that matches the existing slug, abort the change
                if (serverSlug === slug) {
                    return;
                }

                // Because the server transforms the candidate slug by stripping
                // certain characters and appending a number onto the end of slugs
                // to enforce uniqueness, there are cases where we can get back a
                // candidate slug that is a duplicate of the original except for
                // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

                // get the last token out of the slug candidate and see if it's a number
                let slugTokens = serverSlug.split('-');
                let check = Number(slugTokens.pop());

                // if the candidate slug is the same as the existing slug except
                // for the incrementor then the existing slug should be used
                if (isNumber(check) && check > 0) {
                    if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                        this.set('slugValue', slug);

                        return;
                    }
                }

                this.set('model.slug', serverSlug);

                if (this.hasObserverFor('model.titleScratch')) {
                    this.removeObserver('model.titleScratch', this, 'titleObserver');
                }

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('model.isNew')) {
                    return;
                }

                return this.get('model').save();
            }).catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        /**
         * Parse user's set published date.
         * Action sent by post settings menu view.
         * (#1351)
         */
        setPublishedAtUTC(userInput) {
            if (!userInput) {
                // Clear out the publishedAtUTC field for a draft
                if (this.get('model.isDraft')) {
                    this.set('model.publishedAtUTC', null);
                }
                return;
            }

            // The user inputs a date which he expects to be in his timezone. Therefore, from now on
            // we have to work with the timezone offset which we get from the timeZone Service.
            this.get('timeZone.blogTimezone').then((blogTimezone) => {
                let newPublishedAt = parseDateString(userInput, blogTimezone);
                let publishedAtUTC = moment.utc(this.get('model.publishedAtUTC'));
                let errMessage = '';
                let newPublishedAtUTC;

                // Clear previous errors
                this.get('model.errors').remove('post-setting-date');

                // Validate new Published date
                if (!newPublishedAt.isValid()) {
                    errMessage = 'Published Date must be a valid date with format: ' +
                        'DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
                }

                // Date is a valid date, so now make it UTC
                newPublishedAtUTC = moment.utc(newPublishedAt);

                if (newPublishedAtUTC.diff(moment.utc(new Date()), 'hours', true) > 0) {

                    // We have to check that the time from now is not shorter than 2 minutes,
                    // otherwise we'll have issues with the serverside scheduling procedure
                    if (newPublishedAtUTC.diff(moment.utc(new Date()), 'minutes', true) < 2) {
                        errMessage = 'Must be at least 2 minutes from now.';
                    } else {
                        // in case the post is already published and the user sets the date
                        // afterwards to a future time, we stop here, and he has to unpublish
                        // his post first
                        if (this.get('model.isPublished')) {
                            errMessage = 'Your post is already published.';
                            // this is the indicator for the different save button layout
                            this.set('timeScheduled', false);
                        }
                        // everything fine, we can start the schedule workflow and change
                        // the save buttons according to it
                        this.set('timeScheduled', true);
                    }
                    // if the post is already scheduled and the user changes the date back into the
                    // past, we'll set the status of the post back to draft, so he can start all over
                    // again
                } else if (this.get('model.isScheduled')) {
                    this.set('model.status', 'draft');
                }

                // If errors, notify and exit.
                if (errMessage) {
                    this.get('model.errors').add('post-setting-date', errMessage);
                    return;
                }

                // Do nothing if the user didn't actually change the date
                if (publishedAtUTC && publishedAtUTC.isSame(newPublishedAtUTC)) {
                    return;
                }

                // Validation complete
                this.set('model.publishedAtUTC', newPublishedAtUTC);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save().catch((error) => {
                    this.showError(error);
                    this.get('model').rollbackAttributes();
                });
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

        setCoverImage(image) {
            this.set('model.image', image);

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        clearCoverImage() {
            this.set('model.image', '');

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((error) => {
                this.showError(error);
                this.get('model').rollbackAttributes();
            });
        },

        resetPubDate() {
            this.set('publishedAtUTCValue', '');
        },

        closeNavMenu() {
            this.get('application').send('closeNavMenu');
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
            if (currentTagNames.contains(tagName.toLowerCase())) {
                return;
            }

            this.get('availableTags').then((availableTags) => {
                availableTagNames = availableTags.map((tag) => {
                    return tag.get('name').toLowerCase();
                });

                // find existing tag or create new
                if (availableTagNames.contains(tagName.toLowerCase())) {
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
        }
    }
});
