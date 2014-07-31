/* global moment */
import {parseDateString, formatDate} from 'ghost/utils/date-formatting';
import SlugGenerator from 'ghost/models/slug-generator';
import boundOneWay from 'ghost/utils/bound-one-way';

var PostSettingsMenuController = Ember.ObjectController.extend({
    init: function () {
        this._super();

        // when creating a new post we want to observe the title
        // to generate the post's slug
        if (this.get('isNew')) {
            this.addObserver('titleScratch', this, 'titleObserver');
        }
    },
    selectedAuthor: Ember.computed.oneWay('author'),
    changeAuthor: function () {
        var author = this.get('author'),
            selectedAuthor = this.get('selectedAuthor'),
            model = this.get('model'),
            self = this;
        //return if nothing changed
        if (selectedAuthor.get('id') === author.get('id')) {
            return;
        }
        model.set('author', selectedAuthor);
        model.save(this.get('saveOptions')).catch(function (errors) {
            self.showErrors(errors);
            self.set('selectedAuthor', author);
            model.rollback();
        });
    }.observes('selectedAuthor'),
    authors: function () {
        //Loaded asynchronously, so must use promise proxies.
        var deferred = {},
            self = this;

        deferred.promise = this.store.find('user').then(function (users) {
            return users.rejectBy('id', 'me');
        }).then(function (users) {
            self.set('selectedAuthor', users.get('firstObject'));

            return users;
        });

        return Ember.ArrayProxy
            .extend(Ember.PromiseProxyMixin)
            .create(deferred);
    }.property(),
    //Changes in the PSM are too minor to warrant NProgress firing
    saveOptions: {disableNProgress: true},
    /**
     * The placeholder is the published date of the post,
     * or the current date if the pubdate has not been set.
     */
    publishedAtPlaceholder: function () {
        var pubDate = this.get('published_at');
        if (pubDate) {
            return formatDate(pubDate);
        }
        return formatDate(moment());
    }.property('publishedAtValue'),
    publishedAtValue: boundOneWay('published_at', formatDate),

    slugValue: boundOneWay('slug'),
    //Lazy load the slug generator for slugPlaceholder
    slugGenerator: Ember.computed(function () {
        return SlugGenerator.create({
            ghostPaths: this.get('ghostPaths'),
            slugType: 'post'
        });
    }),
    //Requests slug from title
    generateSlugPlaceholder: function () {
        var self = this,
            title = this.get('titleScratch');

        this.get('slugGenerator').generateSlug(title).then(function (slug) {
            self.set('slugPlaceholder', slug);
        });
    },
    titleObserver: function () {
        if (this.get('isNew') && !this.get('title')) {
            Ember.run.debounce(this, 'generateSlugPlaceholder', 700);
        }
    },
    slugPlaceholder: function (key, value) {
        var slug = this.get('slug');

        //If the post has a slug, that's its placeholder.
        if (slug) {
            return slug;
        }

        //Otherwise, it's whatever value was set by the
        //  slugGenerator (below)
        if (arguments.length > 1) {
            return value;
        }
        //The title will stand in until the actual slug has been generated
        return this.get('titleScratch');
    }.property(),

    showErrors: function (errors) {
        errors = Ember.isArray(errors) ? errors : [errors];
        this.notifications.closePassive();
        this.notifications.showErrors(errors);
    },
    showSuccess: function (message) {
        this.notifications.closePassive();
        this.notifications.showSuccess(message);
    },
    actions: {
        togglePage: function () {
            var self = this;

            this.toggleProperty('page');
            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('isNew')) {
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
            var slug = this.get('slug'),
                self = this;

            newSlug = newSlug || slug;

            newSlug = newSlug.trim();

            // Ignore unchanged slugs or candidate slugs that are empty
            if (!newSlug || slug === newSlug) {
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
                if (_.isNumber(check) && check > 0) {
                    if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                        return;
                    }
                }

                self.set('slug', serverSlug);

                if (self.hasObserverFor('titleScratch')) {
                    self.removeObserver('titleScratch', self, 'titleObserver');
                }

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (self.get('isNew')) {
                    return;
                }

                return self.get('model').save(self.get('saveOptions'));
            }).then(function () {
                self.showSuccess('Permalink successfully changed to <strong>' +
                    self.get('slug') + '</strong>.');
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
                publishedAt = this.get('published_at'),
                self = this;

            if (!userInput) {
                //Clear out the published_at field for a draft
                if (this.get('isDraft')) {
                    this.set('published_at', null);
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

            //If errors, notify and exit.
            if (errMessage) {
                this.showErrors(errMessage);
                return;
            }

            // Do nothing if the user didn't actually change the date
            if (publishedAt && publishedAt.isSame(newPublishedAt)) {
                return;
            }

            //Validation complete
            this.set('published_at', newPublishedAt);

            // If this is a new post.  Don't save the model.  Defer the save
            // to the user pressing the save button
            if (this.get('isNew')) {
                return;
            }

            this.get('model').save(this.get('saveOptions')).catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        }
    }
});

export default PostSettingsMenuController;