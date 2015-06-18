import Ember from 'ember';
import {parseDateString, formatDate} from 'ghost/utils/date-formatting';
import SettingsMenuMixin from 'ghost/mixins/settings-menu-controller';
import SlugGenerator from 'ghost/models/slug-generator';
import boundOneWay from 'ghost/utils/bound-one-way';
import isNumber from 'ghost/utils/isNumber';

export default Ember.Controller.extend(SettingsMenuMixin, {
    debounceId: null,
    lastPromise: null,
    selectedAuthor: null,
    uploaderReference: null,

    application: Ember.inject.controller(),
    config: Ember.inject.service(),
    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    initializeSelectedAuthor: Ember.observer('model', function () {
        var self = this;

        return this.get('model.author').then(function (author) {
            self.set('selectedAuthor', author);
            return author;
        });
    }),

    authors: Ember.computed(function () {
        // Loaded asynchronously, so must use promise proxies.
        var deferred = {};

        deferred.promise = this.store.find('user', {limit: 'all'}).then(function (users) {
            return users.rejectBy('id', 'me').sortBy('name');
        }).then(function (users) {
            return users.filter(function (user) {
                return user.get('active');
            });
        });

        return Ember.ArrayProxy
            .extend(Ember.PromiseProxyMixin)
            .create(deferred);
    }),

    /*jshint unused:false */
    publishedAtValue: Ember.computed('model.published_at', {
        get: function () {
            var pubDate = this.get('model.published_at');

            if (pubDate) {
                return formatDate(pubDate);
            }

            return formatDate(moment());
        },
        set: function (key, value) {
            // We're using a fake setter to reset
            // the cache for this property
            return formatDate(moment());
        }
    }),
    /*jshint unused:true */

    slugValue: boundOneWay('model.slug'),

    // Lazy load the slug generator
    slugGenerator: Ember.computed(function () {
        return SlugGenerator.create({
            ghostPaths: this.get('ghostPaths'),
            slugType: 'post'
        });
    }),

    // Requests slug from title
    generateAndSetSlug: function (destination) {
        var self = this,
            title = this.get('model.titleScratch'),
            afterSave = this.get('lastPromise'),
            promise;

        // Only set an "untitled" slug once per post
        if (title === '(Untitled)' && this.get('model.slug')) {
            return;
        }

        promise = Ember.RSVP.resolve(afterSave).then(function () {
            return self.get('slugGenerator').generateSlug(title).then(function (slug) {
                self.set(destination, slug);
            }).catch(function () {
                // Nothing to do (would be nice to log this somewhere though),
                // but a rejected promise needs to be handled here so that a resolved
                // promise is returned.
            });
        });

        this.set('lastPromise', promise);
    },

    metaTitleScratch: boundOneWay('model.meta_title'),
    metaDescriptionScratch: boundOneWay('model.meta_description'),

    seoTitle: Ember.computed('model.titleScratch', 'metaTitleScratch', function () {
        var metaTitle = this.get('metaTitleScratch') || '';

        metaTitle = metaTitle.length > 0 ? metaTitle : this.get('model.titleScratch');

        if (metaTitle.length > 70) {
            metaTitle = metaTitle.substring(0, 70).trim();
            metaTitle = Ember.Handlebars.Utils.escapeExpression(metaTitle);
            metaTitle = Ember.String.htmlSafe(metaTitle + '&hellip;');
        }

        return metaTitle;
    }),

    seoDescription: Ember.computed('model.scratch', 'metaDescriptionScratch', function () {
        var metaDescription = this.get('metaDescriptionScratch') || '',
            el,
            html = '',
            placeholder;

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
            placeholder = $('<div />', {html: html}).text();
            // Replace new lines and trim
            // jscs: disable
            placeholder = placeholder.replace(/\n+/g, ' ').trim();
            // jscs: enable
        }

        if (placeholder.length > 156) {
            // Limit to 156 characters
            placeholder = placeholder.substring(0, 156).trim();
            placeholder = Ember.Handlebars.Utils.escapeExpression(placeholder);
            placeholder = Ember.String.htmlSafe(placeholder + '&hellip;');
        }

        return placeholder;
    }),

    seoURL: Ember.computed('model.slug', function () {
        var blogUrl = this.get('config').blogUrl,
            seoSlug = this.get('model.slug') ? this.get('model.slug') : '',
            seoURL = blogUrl + '/' + seoSlug;

        // only append a slash to the URL if the slug exists
        if (seoSlug) {
            seoURL += '/';
        }

        if (seoURL.length > 70) {
            seoURL = seoURL.substring(0, 70).trim();
            seoURL = Ember.String.htmlSafe(seoURL + '&hellip;');
        }

        return seoURL;
    }),

    // observe titleScratch, keeping the post's slug in sync
    // with it until saved for the first time.
    addTitleObserver: Ember.observer('model', function () {
        if (this.get('model.isNew') || this.get('model.title') === '(Untitled)') {
            this.addObserver('model.titleScratch', this, 'titleObserver');
        }
    }),

    titleObserver: function () {
        var debounceId,
            title = this.get('model.title');

        // generate a slug if a post is new and doesn't have a title yet or
        // if the title is still '(Untitled)' and the slug is unaltered.
        if ((this.get('model.isNew') && !title) || title === '(Untitled)') {
            debounceId = Ember.run.debounce(this, 'generateAndSetSlug', 'model.slug', 700);
        }

        this.set('debounceId', debounceId);
    },

    showErrors: function (errors) {
        errors = Ember.isArray(errors) ? errors : [errors];
        this.get('notifications').showErrors(errors);
    },

    actions: {
        togglePage: function () {
            var self = this;

            this.toggleProperty('model.page');
            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        },

        toggleFeatured: function () {
            var self = this;

            this.toggleProperty('model.featured');

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save(this.get('saveOptions')).catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        },

        /**
         * triggered by user manually changing slug
         */
        updateSlug: function (newSlug) {
            var slug = this.get('model.slug'),
                self = this;

            newSlug = newSlug || slug;

            newSlug = newSlug && newSlug.trim();

            // Ignore unchanged slugs or candidate slugs that are empty
            if (!newSlug || slug === newSlug) {
                // reset the input to its previous state
                this.set('slugValue', slug);

                return;
            }

            this.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {
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
                var slugTokens = serverSlug.split('-'),
                    check = Number(slugTokens.pop());

                // if the candidate slug is the same as the existing slug except
                // for the incrementor then the existing slug should be used
                if (isNumber(check) && check > 0) {
                    if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                        self.set('slugValue', slug);

                        return;
                    }
                }

                self.set('model.slug', serverSlug);

                if (self.hasObserverFor('model.titleScratch')) {
                    self.removeObserver('model.titleScratch', self, 'titleObserver');
                }

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (self.get('model.isNew')) {
                    return;
                }

                return self.get('model').save();
            }).catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        },

        /**
         * Parse user's set published date.
         * Action sent by post settings menu view.
         * (#1351)
         */
        setPublishedAt: function (userInput) {
            var errMessage = '',
                newPublishedAt = parseDateString(userInput),
                publishedAt = this.get('model.published_at'),
                self = this;

            if (!userInput) {
                // Clear out the published_at field for a draft
                if (this.get('model.isDraft')) {
                    this.set('model.published_at', null);
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
                this.showErrors(errMessage);

                return;
            }

            // Do nothing if the user didn't actually change the date
            if (publishedAt && publishedAt.isSame(newPublishedAt)) {
                return;
            }

            // Validation complete
            this.set('model.published_at', newPublishedAt);

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        },

        setMetaTitle: function (metaTitle) {
            var self = this,
                currentTitle = this.get('model.meta_title') || '';

            // Only update if the title has changed
            if (currentTitle === metaTitle) {
                return;
            }

            this.set('model.meta_title', metaTitle);

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch(function (errors) {
                self.showErrors(errors);
            });
        },

        setMetaDescription: function (metaDescription) {
            var self = this,
                currentDescription = this.get('model.meta_description') || '';

            // Only update if the description has changed
            if (currentDescription === metaDescription) {
                return;
            }

            this.set('model.meta_description', metaDescription);

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch(function (errors) {
                self.showErrors(errors);
            });
        },

        setCoverImage: function (image) {
            var self = this;

            this.set('model.image', image);

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        },

        clearCoverImage: function () {
            var self = this;

            this.set('model.image', '');

            if (this.get('model.isNew')) {
                return;
            }

            this.get('model').save().catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        },

        resetUploader: function () {
            var uploader = this.get('uploaderReference');

            if (uploader && uploader[0]) {
                uploader[0].uploaderUi.reset();
            }
        },

        resetPubDate: function () {
            this.set('publishedAtValue', '');
        },

        closeNavMenu: function () {
            this.get('application').send('closeNavMenu');
        },

        changeAuthor: function (newAuthor) {
            var author = this.get('model.author'),
                model = this.get('model'),
                self = this;

            // return if nothing changed
            if (newAuthor.get('id') === author.get('id')) {
                return;
            }

            model.set('author', newAuthor);

            // if this is a new post (never been saved before), don't try to save it
            if (this.get('model.isNew')) {
                return;
            }

            model.save().catch(function (errors) {
                self.showErrors(errors);
                self.set('selectedAuthor', author);
                model.rollback();
            });
        }
    }
});
