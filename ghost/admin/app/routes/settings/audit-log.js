import AdminRoute from 'ghost-admin/routes/admin';

export default class AuditLogRoute extends AdminRoute {
    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Audit log'
        };
    }
}
