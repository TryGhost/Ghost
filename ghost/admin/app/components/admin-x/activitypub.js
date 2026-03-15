import AdminXComponent from './admin-x-component';
import {inject as service} from '@ember/service';

export default class AdminXActivityPub extends AdminXComponent {
    @service upgradeStatus;
    @service settings;

    static packageName = '@tryghost/activitypub';

    additionalProps = () => ({
        activityPubEnabled: this.settings.socialWebEnabled
    });
}
