import Ember from 'ember';
import {parseDateString} from 'ghost/utils/date-formatting';
import SettingsMenuMixin from 'ghost/mixins/settings-menu-controller';
import boundOneWay from 'ghost/utils/bound-one-way';
import isNumber from 'ghost/utils/isNumber';

const {
    $,
    ArrayProxy,
    Controller,
    Handlebars,
    PromiseProxyMixin,
    RSVP,
    computed,
    guidFor,
    inject: {service, controller},
    isArray,
    isBlank,
    observer,
    run
} = Ember;

export default Controller.extend(SettingsMenuMixin, {
    debounceId: null,
    lastPromise: null,
    selectedAuthor: null,
    uploaderReference: null,

    application: controller(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    slugGenerator: service(),

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

    // Requests slug from title
    generateAndSetSlug(destination) {
        let title = this.get('model.titleScratch');
        let afterSave = this.get('lastPromise');
        let promise;

        // Only set an "untitled" slug once per post
        if (title === '(Untitled)' && this.get('model.slug')) {
            return;
        }

        promise = RSVP.resolve(afterSave).then(() => {
            return this.get('slugGenerator').generateSlug('post', title).then((slug) => {
                if (!isBlank(slug)) {
                    this.set(destination, slug);
                }
            }).catch(() => {
                // Nothing to do (would be nice to log this somewhere though),
                // but a rejected promise needs to be handled here so that a resolved
                // promise is returned.
            });
        });

        this.set('lastPromise', promise);
    },

    metaTitleScratch: boundOneWay('model.metaTitle'),
    metaDescriptionScratch: boundOneWay('model.metaDescription'),

    seoTitle: computed('model.titleScratch', 'metaTitleScratch', function () {
        let metaTitle = this.get('metaTitleScratch') || '';

        metaTitle = metaTitle.length > 0 ? metaTitle : this.get('model.titleScratch');

        if (metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = Ember.String.htmlSafe(`${metaTitle}&hellip;`);
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
            placeholder = Ember.String.htmlSafe(`${placeholder}&hellip;`);
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
            seoURL = Ember.String.htmlSafe(`${seoURL}&hellip;`);
        }

        return seoURL;
    }),

    // observe titleScratch, keeping the post's slug in sync
    // with it until saved for the first time.
    addTitleObserver: observer('model', function () {
        if (this.get('model.isNew') || this.get('model.title') === '(Untitled)') {
            this.addObserver('model.titleScratch', this, 'titleObserver');
        }
    }),

    titleObserver() {
        let title = this.get('model.title');
        let debounceId;

        // generate a slug if a post is new and doesn't have a title yet or
        // if the title is still '(Untitled)' and the slug is unaltered.
        if ((this.get('model.isNew') && !title) || title === '(Untitled)') {
            debounceId = run.debounce(this, 'generateAndSetSlug', 'model.slug', 700);
        }

        this.set('debounceId', debounceId);
    },

    // live-query of all tags for tag input autocomplete
    availableTags: computed(function () {
        return this.get('store').filter('tag', {limit: 'all'}, () => {
            return true;
        });
    }),

    showErrors(errors) {
        errors = isArray(errors) ? errors : [errors];
        this.get('notifications').showErrors(errors);
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

            this.get('model').save().catch((errors) => {
                this.showErrors(errors);
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

            this.get('model').save(this.get('saveOptions')).catch((errors) => {
                this.showErrors(errors);
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
            }).catch((errors) => {
                this.showErrors(errors);
                this.get('model').rollbackAttributes();
            });
        },

        /**
         * Parse user's set published date.
         * Action sent by post settings menu view.
         * (#1351)
         */
        setPublishedAt(userInput) {
            let newPublishedAt = parseDateString(userInput);
            let publishedAt = moment(this.get('model.publishedAt'));
            let errMessage = '';

            if (!userInput) {
                // Clear out the publishedAt field for a draft
                if (this.get('model.isDraft')) {
                    this.set('model.publishedAt', null);
                }

                return;
            }

            // Validate new Published date
            if (!newPublishedAt.isValid()) {
                errMessage = 'Published Date must be a valid date with format: ' +
                    'DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
            }
            if (newPublishedAt.diff(new Date(), 'h') > 0) {
                errMessage = 'Published Date cannot currently be in the future.';
            }

            // If errors, notify and exit.
            if (errMessage) {
                this.get('model.errors').add('post-setting-date', errMessage);
                return;
            }

            // Do nothing if the user didn't actually change the date
            if (publishedAt && publishedAt.isSame(newPublishedAt)) {
                return;
            }

            // Validation complete
            this.set('model.publishedAt', newPublishedAt);

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((errors) => {
                this.showErrors(errors);
                this.get('model').rollbackAttributes();
            });
        },

        setMetaTitle(metaTitle) {
            let property = 'metaTitle';
            let model = this.get('model');
            let currentTitle = model.get(property) || '';

            // Only update if the title has changed
            if (currentTitle === metaTitle) {
                return;
            }

            model.set(property, metaTitle);

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (model.get('isNew')) {
                return;
            }

            model.save();
        },

        setMetaDescription(metaDescription) {
            let property = 'metaDescription';
            let model = this.get('model');
            let currentDescription = model.get(property) || '';

            // Only update if the description has changed
            if (currentDescription === metaDescription) {
                return;
            }

            model.set(property, metaDescription);

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (model.get('isNew')) {
                return;
            }

            model.save();
        },

        setCoverImage(image) {
            this.set('model.image', image);

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((errors) => {
                this.showErrors(errors);
                this.get('model').rollbackAttributes();
            });
        },

        clearCoverImage() {
            this.set('model.image', '');

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch((errors) => {
                this.showErrors(errors);
                this.get('model').rollbackAttributes();
            });
        },

        resetUploader() {
            let uploader = this.get('uploaderReference');

            if (uploader && uploader[0]) {
                uploader[0].uploaderUi.reset();
            }
        },

        resetPubDate() {
            this.set('publishedAtValue', '');
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

            model.save().catch((errors) => {
                this.showErrors(errors);
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
