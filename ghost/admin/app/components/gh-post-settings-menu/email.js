import Component from '@ember/component';
import validator from 'validator';
import {action} from '@ember/object';
import {alias, oneWay, or} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Component.extend({
    ajax: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    post: null,
    sendTestEmailError: '',
    savePost: null,

    close() {},
    toggleEmailPreviewModal() {},

    emailSubject: or('emailSubjectScratch', 'post.title'),
    emailSubjectScratch: alias('post.emailSubjectScratch'),

    testEmailAddress: oneWay('session.user.email'),

    mailgunError: computed('settings.memberSubscriptionSettings', function () {
        return !this.settings.get('bulkEmailSettings.isEnabled');
    }),

    actions: {
        setEmailSubject(emailSubject) {
            // Grab the post and current stored email subject
            let post = this.post;
            let currentEmailSubject = post.get('emailSubject');

            // If the subject entered matches the stored email subject, do nothing
            if (currentEmailSubject === emailSubject) {
                return;
            }

            // If the subject entered is different, set it as the new email subject
            post.set('emailSubject', emailSubject);

            // Make sure the email subject is valid and if so, save it into the post
            return post.validate({property: 'emailSubject'}).then(() => {
                if (post.get('isNew')) {
                    return;
                }

                return this.savePost.perform();
            });
        },

        discardEnter() {
            return false;
        }
    },

    toggleEmailPreview: action(function () {
        this.toggleEmailPreviewModal();
    }),

    sendTestEmail: task(function* () {
        try {
            const resourceId = this.post.id;
            const testEmail = this.testEmailAddress.trim();
            if (!validator.isEmail(testEmail)) {
                this.set('sendTestEmailError', 'Please enter a valid email');
                return false;
            }
            if (!this.settings.get('bulkEmailSettings.isEnabled')) {
                this.set('sendTestEmailError', 'Please configure Mailgun in Labs → Members');
                return false;
            }
            this.set('sendTestEmailError', '');
            const url = this.ghostPaths.url.api('/email_preview/posts', resourceId);
            const data = {emails: [testEmail]};
            const options = {
                data,
                dataType: 'json'
            };
            return yield this.ajax.post(url, options);
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'send.previewEmail'});
            }
        }
    }).drop()
});
