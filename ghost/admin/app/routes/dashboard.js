import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

// Redirect all users to analytics since dashboard has been retired
export default class DashboardRoute extends AdminRoute {
    @service router;

    async beforeModel() {
        this.router.replaceWith('stats-x');
    }
}
