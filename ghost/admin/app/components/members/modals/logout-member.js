import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class LogoutMemberModal extends Component {
    @service notifications;
    @service ajax;
    @service ghostPaths;

    get member() {
        return this.args.data.member;
    }

    @task({drop: true})
    *logoutMemberTask() {
        try {
            const url = this.ghostPaths.url.api('/members/', this.member.id, '/sessions/');
            const options = {};
            yield this.ajax.delete(url, options);

            this.args.data.afterLogout?.();
            this.notifications.showNotification(`${this.member.name || this.member.email} has been signed out from all devices.`, {type: 'success'});
            this.args.close(true);
            return true;
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'member.logout'});
            this.args.close(false);
            throw e;
        }
    }
}
