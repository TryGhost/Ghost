import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class DisableCommentingModal extends Component {
    @service notifications;
    @service ajax;
    @service ghostPaths;

    @tracked hideComments = false;

    get member() {
        return this.args.data.member;
    }

    @task({drop: true})
    *disableCommentingTask() {
        try {
            const url = this.ghostPaths.url.api('members', this.member.id, 'commenting', 'disable');
            yield this.ajax.post(url, {
                data: JSON.stringify({
                    reason: 'Disabled from member settings',
                    hide_comments: this.hideComments
                }),
                contentType: 'application/json'
            });

            this.args.data.afterDisable?.();
            this.notifications.showNotification(`Commenting has been disabled for ${this.member.name || this.member.email}.`, {type: 'success'});
            this.args.close(true);
            return true;
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'member.disable-commenting'});
            this.args.close(false);
            throw e;
        }
    }
}
