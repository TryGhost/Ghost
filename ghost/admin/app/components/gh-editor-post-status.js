import Component from '@ember/component';
import config from 'ghost-admin/config/environment';
import {task, timeout} from 'ember-concurrency';

export default Component.extend({
    post: null,
    isSaving: false,

    'data-test-editor-post-status': true,

    _isSaving: false,

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
