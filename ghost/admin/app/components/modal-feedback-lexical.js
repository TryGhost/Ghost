import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class FeedbackLexicalModalComponent extends Component {
    @service ajax;
    @service ghostPaths;
    @service session;
    @service notifications;

    @inject config;

    constructor(...args) {
        super(...args);
        this.feedbackMessage = this.args.feedbackMessage;
    }

    @action
    closeModal() {
        this.args.close();
    }

    @task({drop: true})
    *submitFeedback() {
        let url = `https://submit-form.com/us6uBWv8`;
        
        let postData;
        if (this.args.data?.post) {
            postData = {
                PostId: this.args.data.post?.id,
                PostTitle: this.args.data.post?.title
            };
        }

        let ghostData = {
            Site: this.config.blogUrl,
            StaffMember: this.session.user.name,
            StaffMemberEmail: this.session.user.email,
            StaffAccessLevel: this.session.user.role?.description,
            UserAgent: navigator.userAgent,
            Version: this.config.version,
            Feedback: this.feedbackMessage
        };

        let data = {
            ...ghostData,
            ...postData
        };

        // let response = yield this.ajax.post(url, {data});

        // if (response.status < 200 || response.status >= 300) {
        //     throw new Error('api failed ' + response.status + ' ' + response.statusText);
        // }

        this.args.close();

        this.notifications.showNotification('Feedback sent',
            {
                icon: 'send-email',
                description: 'Thank you!'
            }
        );

        yield data;
        // return response;
    }
}