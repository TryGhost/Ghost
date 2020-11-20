import Component from '@ember/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default Component.extend({
    config: service(),
    tagName: '',
    isLink: true,

    toggleValue: computed('isLink', function () {
        return this.isLink ? 'Data attributes' : 'Links';
    }),

    sectionHeaderLabel: computed('isLink', function () {
        return this.isLink ? 'Link' : 'Data attribute';
    }),

    init() {
        this._super(...arguments);
        this.siteUrl = this.config.get('blogUrl');
    },

    actions: {
        toggleShowLinks() {
            this.toggleProperty('isLink');
        }
    },
    copyDefault: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copySignup: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copySignupMonthly: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copySignupYearly: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copySignupFree: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copySignin: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copyAccountHome: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copyAccountPlans: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copyAccountProfile: task(function* (data) {
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    })
});
