import AdminXComponent from './admin-x-component';
import {inject as service} from '@ember/service';

export default class AdminXDemo extends AdminXComponent {
    @service upgradeStatus;

    static packageName = '@tryghost/admin-x-demo';
}
