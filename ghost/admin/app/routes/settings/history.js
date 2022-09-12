import AdminRoute from 'ghost-admin/routes/admin';

export default class HistoryRoute extends AdminRoute {
    buildRouteInfoMetadata() {
        return {
            titleToken: 'History log'
        };
    }
}
