import Component from '@glimmer/component';
import moment from 'moment';
import {inject as service} from '@ember/service';

export default class PublishFlowOptions extends Component {
    @service settings;

    // store any derived state from PublishOptions on creation so the copy
    // doesn't change whilst the post is saving
    willEmail = this.args.publishOptions.willEmail;
    willPublish = this.args.publishOptions.willPublish;

    get confirmButtonText() {
        const publishType = this.args.publishOptions.publishType;

        let buttonText = '';

        if (publishType === 'publish+send') {
            buttonText = 'Publish & send';
        } else if (publishType === 'publish') {
            buttonText = `Publish ${this.args.publishOptions.post.displayName}`;
        } else if (publishType === 'send') {
            buttonText = 'Send email';
        }

        if (this.args.publishOptions.isScheduled) {
            const scheduleMoment = moment.tz(this.args.publishOptions.scheduledAtUTC, this.settings.get('timezone'));
            buttonText += `, on ${scheduleMoment.format('MMMM Do')}`;
        } else {
            buttonText += ', right now';
        }

        return buttonText;
    }
}
