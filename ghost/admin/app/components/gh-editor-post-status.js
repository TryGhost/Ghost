import Component from 'ember-component';
import computed, {reads} from 'ember-computed';
import {task, timeout} from 'ember-concurrency';

// TODO: reduce when in testing mode
const SAVE_TIMEOUT_MS = 3000;

export default Component.extend({
    post: null,
    isScheduled: reads('post.isScheduled'),
    isSaving: false,

    'data-test-editor-post-status': true,

    _isSaving: false,

    isPublished: computed('post.{isPublished,pastScheduledTime}', function () {
        let isPublished = this.get('post.isPublished');
        let pastScheduledTime = this.get('post.pastScheduledTime');

        return isPublished || pastScheduledTime;
    }),

    // isSaving will only be true briefly whilst the post is saving,
    // we want to ensure that the "Saving..." message is shown for at least
    // a few seconds so that it's noticeable
    didReceiveAttrs() {
        if (this.get('isSaving')) {
            this.get('showSavingMessage').perform();
        }
    },

    showSavingMessage: task(function* () {
        this.set('_isSaving', true);
        yield timeout(SAVE_TIMEOUT_MS);
        this.set('_isSaving', false);
    }).drop()
});
