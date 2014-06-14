/* global moment */
import {parseDateString, formatDate} from 'ghost/utils/date-formatting';
import SlugGenerator from 'ghost/models/slug-generator';

var PostSettingsMenuController = Ember.ObjectController.extend({
    isStaticPage: function (key, val) {
        var self = this;

        if (arguments.length > 1) {
            this.set('page', val);

            return this.get('model').save().then(function () {
                self.notifications.showSuccess('Successfully converted to ' + (val ? 'static page' : 'post'));

                return self.get('page');
            }, this.notifications.showErrors);
        }

        return this.get('page');
    }.property('page'),
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

    publishedAtValue: function (key, value) {
        if (arguments.length > 1) {
            return value;
        }
        return formatDate(this.get('published_at'));
    }.property('published_at'),

    slugValue: function (key, value) {
        if (arguments.length > 1) {
            return value;
        }
        return this.get('slug');
    }.property('slug'),

    //Lazy load the slug generator for slugPlaceholder
    slugGenerator: Ember.computed(function () {
        return SlugGenerator.create({ghostPaths: this.get('ghostPaths')});
    }),
    //Requests slug from title
    generateSlugPlaceholder: function () {
        var self = this,
            slugGenerator = this.get('slugGenerator'),
            title = this.get('title');
        slugGenerator.generateSlug(title).then(function (slug) {
            return self.set('slugPlaceholder', slug);
        });
    },
    titleObserver: function () {
        Ember.run.debounce(this, 'generateSlugPlaceholder', 700);
    }.observes('title'),
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
        return this.get('title');
    }.property(),

    actions: {
        /**
         * triggered by user manually changing slug
         */
        updateSlug: function (newSlug) {
            var slug = this.get('slug'),
                self = this;

            // Ignore unchanged slugs
            if (slug === newSlug) {
                return;
            }

            this.set('slug', newSlug);

            //Don't save just yet if it's an empty slug on a draft
            if (!newSlug && this.get('isDraft')) {
                return;
            }

            this.get('model').save('slug').then(function () {
                self.notifications.showSuccess('Permalink successfully changed to <strong>' +
                    self.get('slug') + '</strong>.');
            }, this.notifications.showErrors);
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

            // Do nothing if the user didn't actually change the date
            if (publishedAt && publishedAt.isSame(newPublishedAt)) {
                return;
            }

            // Validate new Published date
            if (!newPublishedAt.isValid()) {
                errMessage = 'Published Date must be a valid date with format: ' +
                    'DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
            }

            //Can't publish in the future yet
            if (newPublishedAt.diff(new Date(), 'h') > 0) {
                errMessage = 'Published Date cannot currently be in the future.';
            }

            //If errors, notify and exit.
            if (errMessage) {
                this.notifications.showError(errMessage);
                return;
            }

            //Validation complete
            this.set('published_at', newPublishedAt);

            //@ TODO: Make sure we're saving ONLY the publish date here,
            // Don't want to accidentally save text the user's been working on.
            this.get('model').save('published_at').then(function () {
                self.notifications.showSuccess('Publish date successfully changed to <strong>' +
                    formatDate(self.get('published_at')) + '</strong>.');
            }, this.notifications.showErrors);
        }
    }
});

export default PostSettingsMenuController;
