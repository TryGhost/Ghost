import Component from '@glimmer/component';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class FeedbackLexicalSendButtonComponent extends Component {
    @service ajax;
    @service ghostPaths;
    @service session;
    @service notifications;

    @inject config;

    get isDisabled() {
        return !this.args.feedbackMessage;
    }

    @task({drop: true})
    *submitFeedback() {
        let url = `https://submit-form.com/us6uBWv8`;

        let postData;
        if (this.args?.post) {
            postData = {
                PostId: this.args.post?.id,
                PostTitle: this.args.post?.title
            };
        }

        let ghostData = {
            Site: this.config.blogUrl,
            StaffMember: this.session.user.name,
            StaffMemberEmail: this.session.user.email,
            StaffAccessLevel: this.session.user.role?.description,
            UserAgent: navigator.userAgent,
            GhostVersion: this.config.version,
            KoenigLexicalVersion: window['@tryghost/koenig-lexical'].version,
            Feedback: this.args.feedbackMessage
        };

        let data = {
            ...ghostData,
            ...postData
        };

        let response = yield this.ajax.post(url, {data});

        if (response.status < 200 || response.status >= 300) {
            throw new Error('api failed ' + response.status + ' ' + response.statusText);
        }

        this.args.onSuccess?.();

        this.notifications.showNotification('Feedback sent',
            {
                icon: 'send-email',
                description: 'Thank you!'
            }
        );

        return response;
    }
}
