import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class SendWelcomeEmailModal extends Component {
    @service notifications;

    get member() {
        return this.args.data.member;
    }

    get hasBeenSent() {
        return !!this.member.welcomeEmailSentAtUTC;
    }

    @task({drop: true})
    *sendTask() {
        try {
            yield this.member.sendWelcomeEmail.perform();

            this.args.data.afterSend?.();
            this.notifications.showNotification(
                `Welcome email sent to ${this.member.name || this.member.email}.`,
                {type: 'success'}
            );
            this.args.close(true);
            return true;
        } catch (e) {
            // Keep the modal open on failure so GhTaskButton can show its
            // error/retry pip — closing here destroys the button before it
            // renders that state. The notification already informs the user.
            this.notifications.showAPIError(e, {key: 'member.send-welcome-email'});
            throw e;
        }
    }
}
