import $ from 'jquery';
import Component from '@ember/component';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Component.extend({
    clock: service(),

    classNames: 'gh-publishmenu',
    post: null,
    saveTask: null,
    runningText: null,

    _publishedAtBlogTZ: null,
    _previousStatus: null,

    isClosing: null,

    forcePublishedMenu: reads('post.pastScheduledTime'),

    postState: computed('post.{isPublished,isScheduled}', 'forcePublishedMenu', function () {
        if (this.get('forcePublishedMenu') || this.get('post.isPublished')) {
            return 'published';
        } else if (this.get('post.isScheduled')) {
            return 'scheduled';
        } else {
            return 'draft';
        }
    }),

    triggerText: computed('postState', function () {
        let state = this.get('postState');

        if (state === 'published') {
            return 'Update';
        } else if (state === 'scheduled') {
            return 'Scheduled';
        } else {
            return 'Publish';
        }
    }),

    _runningText: computed('postState', 'saveType', function () {
        let saveType = this.get('saveType');
        let postState = this.get('postState');
        let runningText;

        if (postState === 'draft') {
            runningText = saveType === 'publish' ? 'Publishing' : 'Scheduling';
        }

        if (postState === 'published') {
            runningText = saveType === 'publish' ? 'Updating' : 'Unpublishing';
        }

        if (postState === 'scheduled') {
            runningText = saveType === 'schedule' ? 'Rescheduling' : 'Unscheduling';
        }

        return runningText || 'Publishing';
    }),

    buttonText: computed('postState', 'saveType', function () {
        let saveType = this.get('saveType');
        let postState = this.get('postState');
        let buttonText;

        if (postState === 'draft') {
            buttonText = saveType === 'publish' ? 'Publish' : 'Schedule';
        }

        if (postState === 'published') {
            buttonText = saveType === 'publish' ? 'Update' : 'Unpublish';
        }

        if (postState === 'scheduled') {
            buttonText = saveType === 'schedule' ? 'Reschedule' : 'Unschedule';
        }

        return buttonText || 'Publish';
    }),

    successText: computed('_previousStatus', 'postState', function () {
        let postState = this.get('postState');
        let previousStatus = this.get('_previousStatus');
        let buttonText;

        if (previousStatus === 'draft') {
            buttonText = postState === 'published' ? 'Published' : 'Scheduled';
        }

        if (previousStatus === 'published') {
            buttonText = postState === 'draft' ? 'Unpublished' : 'Updated';
        }

        if (previousStatus === 'scheduled') {
            buttonText = postState === 'draft' ? 'Unscheduled' : 'Rescheduled';
        }

        return buttonText;
    }),

    actions: {
        setSaveType(saveType) {
            let post = this.get('post');

            this.set('saveType', saveType);

            if (saveType === 'draft') {
                post.set('statusScratch', 'draft');
            } else if (saveType === 'schedule') {
                post.set('statusScratch', 'scheduled');
            } else if (saveType === 'publish') {
                post.set('statusScratch', 'published');
            }
        },

        open() {
            this._cachePublishedAtBlogTZ();
            this.set('isClosing', false);
            this.get('post.errors').clear();
            if (this.get('onOpen')) {
                this.get('onOpen')();
            }
        },

        close(dropdown, e) {
            let post = this.get('post');

            // don't close the menu if the datepicker popup is clicked
            if (e && $(e.target).closest('.ember-power-datepicker-content').length) {
                return false;
            }

            // cleanup
            this._resetPublishedAtBlogTZ();
            post.set('statusScratch', null);
            post.validate();

            if (this.get('onClose')) {
                this.get('onClose')();
            }

            this.set('isClosing', true);

            return true;
        }
    },

    save: task(function* () {
        // runningText needs to be declared before the other states change during the
        // save action.
        this.set('runningText', this.get('_runningText'));
        this.set('_previousStatus', this.get('post.status'));
        this.get('setSaveType')(this.get('saveType'));

        try {
            // validate publishedAtBlog first to avoid an alert for displayed errors
            yield this.get('post').validate({property: 'publishedAtBlog'});

            // actual save will show alert for other failed validations
            let post = yield this.get('saveTask').perform();

            this._cachePublishedAtBlogTZ();
            return post;
        } catch (error) {
            // re-throw if we don't have a validation error
            if (error) {
                throw error;
            }
        }
    }),

    _cachePublishedAtBlogTZ() {
        this._publishedAtBlogTZ = this.get('post.publishedAtBlogTZ');
    },

    // when closing the menu we reset the publishedAtBlogTZ date so that the
    // unsaved changes made to the scheduled date aren't reflected in the PSM
    _resetPublishedAtBlogTZ() {
        this.get('post').set('publishedAtBlogTZ', this._publishedAtBlogTZ);
    }
});
