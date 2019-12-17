import Component from '@ember/component';
import config from 'ghost-admin/config/environment';
import moment from 'moment';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default Component.extend({
    clock: service(),

    post: null,
    isSaving: false,

    'data-test-editor-post-status': true,

    _isSaving: false,

    countdown: computed('post.{publishedAtUTC,isScheduled}', 'clock.second', function () {
        let isScheduled = this.get('post.isScheduled');
        let publishTime = this.get('post.publishedAtUTC') || moment.utc();

        let timeUntilPublished = publishTime.diff(moment.utc(), 'minutes', true);
        let isPublishedSoon = timeUntilPublished > 0 && timeUntilPublished < 15;

        // force a recompute
        this.get('clock.second');

        if (isScheduled && isPublishedSoon) {
            return moment(publishTime).fromNow();
        } else {
            return false;
        }
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

        if (!this.isDestroyed && !this.isDestroying) {
            this.set('_isSaving', false);
        }
    }).drop()
});
