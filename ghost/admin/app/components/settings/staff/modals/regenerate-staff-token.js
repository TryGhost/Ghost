import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class RegenerateStaffTokenModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service notifications;

    @action
    async regenerateStaffToken() {
        const url = this.ghostPaths.url.api('users', 'me', 'token');

        try {
            const {apiKey} = await this.ajax.put(url, {data: {}});

            this.args.close(`${apiKey.id}:${apiKey.secret}`);
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'token.regenerate'});
            this.args.close();
        }
    }
}
