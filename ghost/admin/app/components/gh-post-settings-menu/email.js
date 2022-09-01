import Component from '@ember/component';
import EmailFailedError from 'ghost-admin/errors/email-failed-error';
import classic from 'ember-classic-decorator';
import validator from 'validator';
import {action, computed} from '@ember/object';
import {alias, not, oneWay, or} from '@ember/object/computed';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const RETRY_EMAIL_POLL_LENGTH = 1000;
const RETRY_EMAIL_MAX_POLL_LENGTH = 15 * 1000;

@classic
export default class Email extends Component {
    @service ajax;
    @service ghostPaths;
    @service notifications;
    @service session;
    @service settings;
    @service config;

    post = null;
    sendTestEmailError = '';
    savePostTask = null;
    close() {}

    @or('emailSubjectScratch', 'post.title')
        emailSubject;

    @alias('post.emailSubjectScratch')
        emailSubjectScratch;

    @oneWay('session.user.email')
        testEmailAddress;

    @not('mailgunIsEnabled')
        mailgunError;

    @computed(
        'settings.{mailgunApiKey,mailgunDomain,mailgunBaseUrl}',
        'config.mailgunIsConfigured'
    )
    get mailgunIsEnabled() {
        return this.get('settings.mailgunApiKey') && this.get('settings.mailgunDomain') && this.get('settings.mailgunBaseUrl') || this.get('config.mailgunIsConfigured');
    }

    @action
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

            return this.savePostTask.perform();
        });
    }

    @action
    discardEnter() {
        return false;
    }

    @(task(function* () {
        try {
            const resourceId = this.post.id;
            const testEmail = this.testEmailAddress.trim();
            if (!validator.isEmail(testEmail)) {
                this.set('sendTestEmailError', 'Please enter a valid email');
                return false;
            }
            if (!this.mailgunIsEnabled) {
                this.set('sendTestEmailError', 'Please verify your email settings');
                return false;
            }
            this.set('sendTestEmailError', '');
            const url = this.ghostPaths.url.api('/email_previews/posts', resourceId);
            const data = {emails: [testEmail]};
            const options = {
                data,
                dataType: 'json'
            };
            yield this.ajax.post(url, options);
            return true;
        } catch (error) {
            if (error) {
                let message = 'Email could not be sent, verify mail settings';

                // grab custom error message if present
                if (
                    error.payload && error.payload.errors
                    && error.payload.errors[0] && error.payload.errors[0].message) {
                    message = htmlSafe(error.payload.errors[0].message);
                }

                this.set('sendTestEmailError', message);
            }
        }
    }).drop())
        sendTestEmail;

    @task(function* () {
        let {email} = this.post;

        if (email && email.status === 'failed') {
            // trigger the retry
            yield email.retry();

            // poll for success/failure state
            let pollTimeout = 0;
            while (pollTimeout < RETRY_EMAIL_MAX_POLL_LENGTH) {
                yield timeout(RETRY_EMAIL_POLL_LENGTH);
                yield email.reload();

                if (email.status === 'submitted') {
                    break;
                }
                if (email.status === 'failed') {
                    throw new EmailFailedError(email.error);
                }
                pollTimeout += RETRY_EMAIL_POLL_LENGTH;
            }
        }

        return true;
    })
        retryEmail;
}
