import AdminXComponent from './admin-x-component';
import {inject as service} from '@ember/service';

export default class AdminXActivityPub extends AdminXComponent {
    @service upgradeStatus;
    @service feature;

    static packageName = '@tryghost/admin-x-activitypub';

    additionalProps = () => ({
        activityPubEnabled: this.feature.ActivityPub
    });
}
