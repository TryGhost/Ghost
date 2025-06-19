import AdminXComponent from './admin-x-component';
import {getOwner} from '@ember/application';
import {inject as service} from '@ember/service';

export default class Posts extends AdminXComponent {
    @service upgradeStatus;

    additionalProps = () => {
        // Get the controller using getOwner - more reliable than router access
        const owner = getOwner(this);
        const controller = owner.lookup('controller:posts-x');

        // Use controller value if available, otherwise fall back to args
        const fromAnalytics = controller?.fromAnalytics ?? this.args.fromAnalytics ?? false;

        return {
            fromAnalytics: fromAnalytics
        };
    };

    static packageName = '@tryghost/posts';
}
