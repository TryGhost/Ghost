import {parseDateString, formatDate} from 'ghost/utils/date-formatting';

var equal = Ember.computed.equal;

var PostController = Ember.ObjectController.extend({

    isPublished: equal('status', 'published'),
    isDraft: equal('status', 'draft'),
    isEditingSettings: false,
    isStaticPage: function (key, val) {
        if (arguments.length > 1) {
            this.set('model.page', val ? 1 : 0);
            this.get('model').save('page').then(function () {
                this.notifications.showSuccess('Succesfully converted ' + (val ? 'to static page' : 'to post'));
            }, this.notifications.showErrors);
        }
        return !!this.get('model.page');
    }.property('model.page'),

    isOnServer: function () {
        return this.get('model.id') !== undefined;
    }.property('model.id'),

    newSlugBinding: Ember.Binding.oneWay('model.slug'),
    slugPlaceholder: null,
    // Requests a new slug when the title was changed
    updateSlugPlaceholder: function () {
        var model,
            self = this,
            title = this.get('title');

        // If there's a title present we want to
        // validate it against existing slugs in the db
        // and then update the placeholder value.
        if (title) {
            model = self.get('model');
            model.generateSlug().then(function (slug) {
                self.set('slugPlaceholder', slug);
            }, function () {
                self.notifications.showWarn('Unable to generate a slug for "' + title + '"');
            });
        } else {
            // If there's no title set placeholder to blank
            // and don't make an ajax request to server
            // for a proper slug (as there won't be any).
            self.set('slugPlaceholder', '');
        }
    }.observes('model.title'),

    publishedAt: null,
    publishedAtChanged: function () {
        this.set('publishedAt', formatDate(this.get('model.published_at')));
    }.observes('model.published_at'),
        
    actions: {
        editSettings: function () {
            this.toggleProperty('isEditingSettings');
            if (this.get('isEditingSettings')) {
                //Stop editing if the user clicks outside the settings view
                Ember.run.next(this, function () {
                    var self = this;
                    // @TODO has a race condition with click on the editSettings action
                    $(document).one('click', function () {
                        self.toggleProperty('isEditingSettings');
                    });
                });
            }
        },
        updateSlug: function () {
            var newSlug = this.get('newSlug'),
                slug = this.get('model.slug'),
                placeholder = this.get('slugPlaceholder'),
                self = this;
            
            newSlug = (!newSlug && placeholder) ? placeholder : newSlug;
            
            // Ignore unchanged slugs
            if (slug === newSlug) {
                return;
            }
            //reset to model's slug on empty string
            if (!newSlug) {
                this.set('newSlug', slug);
                return;
            }

            //Validation complete
            this.set('model.slug', newSlug);

            // If the model doesn't currently
            // exist on the server
            // then just update the model's value
            if (!this.get('isOnServer')) {
                return;
            }
            
            this.get('model').save('slug').then(function () {
                self.notifications.showSuccess('Permalink successfully changed to <strong>' + this.get('model.slug') + '</strong>.');
            }, this.notifications.showErrors);
        },

        updatePublishedAt: function (userInput) {
            var errMessage = '',
                newPubDate = formatDate(parseDateString(userInput)),
                pubDate = this.get('publishedAt'),
                newPubDateMoment,
                pubDateMoment;

            // if there is no new pub date, mark that until the post is published,
            //    when we'll fill in with the current time.
            if (!newPubDate) {
                this.set('publishedAt', '');
                return;
            }

            // Check for missing time stamp on new data
            // If no time specified, add a 12:00
            if (newPubDate && !newPubDate.slice(-5).match(/\d+:\d\d/)) {
                newPubDate += " 12:00";
            }

            newPubDateMoment = parseDateString(newPubDate);

            // If there was a published date already set
            if (pubDate) {
                // Check for missing time stamp on current model
                // If no time specified, add a 12:00
                if (!pubDate.slice(-5).match(/\d+:\d\d/)) {
                    pubDate += " 12:00";
                }

                pubDateMoment = parseDateString(pubDate);

                // Quit if the new date is the same
                if (pubDateMoment.isSame(newPubDateMoment)) {
                    return;
                }
            }

            // Validate new Published date
            if (!newPubDateMoment.isValid() || newPubDate.substr(0, 12) === "Invalid date") {
                errMessage = 'Published Date must be a valid date with format: DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
            }

            if (newPubDateMoment.diff(new Date(), 'h') > 0) {
                errMessage = 'Published Date cannot currently be in the future.';
            }

            if (errMessage) {
                // Show error message
                this.notifications.showError(errMessage);
                //Hack to push a "change" when it's actually staying
                //  the same.
                //This alerts the listener on post-settings-menu
                this.notifyPropertyChange('publishedAt');
                return;
            }

            //Validation complete
            this.set('model.published_at', newPubDateMoment.toDate());

            // If the model doesn't currently
            // exist on the server
            // then just update the model's value
            if (!this.get('isOnServer')) {
                return;
            }
            
            this.get('model').save('published_at').then(function () {
                this.notifications.showSuccess('Publish date successfully changed to <strong>' + this.get('publishedAt') + '</strong>.');
            }, this.notifications.showErrors);
        }
    }
});

export default PostController;
