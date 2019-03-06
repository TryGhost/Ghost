import Component from '@ember/component';
import config from 'ghost-admin/config/environment';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {task, timeout} from 'ember-concurrency';

export default Component.extend({
    post: null,
    isSaving: false,

    'data-test-editor-post-status': true,

    _isSaving: false,

    isNew: reads('post.isNew'),
    isScheduled: reads('post.isScheduled'),

    isPublished: computed('post.{isPublished,pastScheduledTime}', function () {
        let isPublished = this.get('post.isPublished');
        let pastScheduledTime = this.get('post.pastScheduledTime');

        return isPublished || pastScheduledTime;
    }),

    // isSaving will only be true briefly whilst the post is saving,
    // we want to ensure that the "Saving..." message is shown for at least
    // a few seconds so that it's noticeable
    didReceiveAttrs() {
        if (this.isSaving) {
            this.showSavingMessage.perform();
        }
    },

    showSavingMessage: task(function* () {
        this.set('_isSaving', true);
        yield timeout(config.environment === 'test' ? 0 : 3000);
        this.set('_isSaving', false);
    }).drop()
});
