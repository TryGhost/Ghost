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
        const publishOptions = this.args.publishOptions;

        let buttonText = '';

        if (publishOptions.willPublish && publishOptions.willEmail) {
            buttonText = 'Publish & send';
        } else if (publishOptions.willOnlyEmail) {
            buttonText = 'Send email';
        } else {
            buttonText = `Publish ${this.args.publishOptions.post.displayName}`;
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
