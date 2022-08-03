import ModalComponent from 'ghost-admin/components/modal-base';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default ModalComponent.extend({
    config: service(),
    store: service(),

    classNames: 'modal-impersonate-member',

    signinUrl: null,
    member: alias('model'),

    didInsertElement() {
        this._super(...arguments);

        this._signinUrlUpdateTask.perform();
    },

    actions: {
        // noop - we don't want the enter key doing anything
        confirm() {}
    },

    copySigninUrl: task(function* () {
        copyTextToClipboard(this.signinUrl);
        yield timeout(1000);
        return true;
    }),

    _signinUrlUpdateTask: task(function*() {
        const memberSigninURL = yield this.member.fetchSigninUrl.perform();

        this.set('signinUrl', memberSigninURL.url);
    }).drop()
});
