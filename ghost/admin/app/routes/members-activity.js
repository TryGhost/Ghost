import AdminRoute from 'ghost-admin/routes/admin';

export default class MembersActivityRoute extends AdminRoute {
    buildRouteInfoMetadata() {
        return {
            titleToken: 'Activity',
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
