import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class EmailSubject extends Component {
    @tracked isEditing = false;

    get subject() {
        const {post} = this.args;
        return post.emailSubject || post.title;
    }

    @action
    setSubject(event) {
        if (this.isEditing) {
            this.isEditing = false;
        }

        // Grab the post and current stored email subject
        let emailSubject = event.target.value;
        let post = this.args.post;
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
            return this.args.savePostTask.perform();
        });
    }

    @action
    editSubject() {
        this.isEditing = true;
    }
}
