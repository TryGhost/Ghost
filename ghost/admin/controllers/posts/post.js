/* global console */
import {parseDateString, formatDate} from 'ghost/utils/date-formatting';

var PostController = Ember.ObjectController.extend({
    //## Editor state properties
    isEditingSettings: false,
    isViewingSaveTypes: false,

    //## Computed post properties
    isPublished: Ember.computed.equal('status', 'published'),
    isDraft: Ember.computed.equal('status', 'draft'),
    willPublish: Ember.computed.oneWay('isPublished'),
    isStaticPage: function (key, val) {
        var self = this;

        if (arguments.length > 1) {
            this.set('page', val ? 1 : 0);

            return this.get('model').save().then(function () {
                self.notifications.showSuccess('Successfully converted to ' + (val ? 'static page' : 'post'));

                return !!self.get('page');
            }, this.notifications.showErrors);
        }

        return !!this.get('page');
    }.property('page'),

    newSlugBinding: Ember.computed.oneWay('slug'),

    slugPlaceholder: function () {
        return this.get('model').generateSlug();
    }.property('title'),

    actions: {
        save: function () {
            var status = this.get('willPublish') ? 'published' : 'draft',
                self = this;
                       
            this.set('model.status', status);
            this.get('model').save().then(function () {
                console.log('saved');
                self.notifications.showSuccess('Post status saved as <strong>' +
                    self.get('model.status') + '</strong>.');
            }, this.notifications.showErrors);
        },
        viewSaveTypes: function () {
            this.toggleProperty('isViewingSaveTypes');
        },
        setSaveType: function (newType) {
            if (newType === 'publish') {
                this.set('willPublish', true);
            } else if (newType === 'draft') {
                this.set('willPublish', false);
            } else {
                console.warn('Received invalid save type; ignoring.');
            }
        },
        toggleFeatured: function () {
            this.set('featured', !this.get('featured'));

            this.get('model').save();
        },
        editSettings: function () {
            var isEditing = this.toggleProperty('isEditingSettings');
            if (isEditing) {
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
                slug = this.get('slug'),
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
            this.set('slug', newSlug);

            // If the model doesn't currently
            // exist on the server
            // then just update the model's value
            if (!this.get('isNew')) {
                return;
            }

            this.get('model').save().then(function () {
                self.notifications.showSuccess('Permalink successfully changed to <strong>' +
                    self.get('slug') + '</strong>.');
            }, this.notifications.showErrors);
        },

        updatePublishedAt: function (userInput) {
            var self = this,
                errMessage = '',
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
                newPubDate += ' 12:00';
            }

            newPubDateMoment = parseDateString(newPubDate);

            // If there was a published date already set
            if (pubDate) {
                // Check for missing time stamp on current model
                // If no time specified, add a 12:00
                if (!pubDate.slice(-5).match(/\d+:\d\d/)) {
                    pubDate += ' 12:00';
                }

                pubDateMoment = parseDateString(pubDate);

                // Quit if the new date is the same
                if (pubDateMoment.isSame(newPubDateMoment)) {
                    return;
                }
            }

            // Validate new Published date
            if (!newPubDateMoment.isValid() || newPubDate.substr(0, 12) === 'Invalid date') {
                errMessage = 'Published Date must be a valid date with format: ' +
                    'DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
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
            this.set('published_at', newPubDateMoment.toDate());

            // If the model doesn't currently
            // exist on the server
            // then just update the model's value
            if (!this.get('isNew')) {
                return;
            }

            this.get('model').save().then(function () {
                this.notifications.showSuccess('Publish date successfully changed to <strong>' +
                    self.get('publishedAt') + '</strong>.');
            }, this.notifications.showErrors);
        }
    }
});

export default PostController;
