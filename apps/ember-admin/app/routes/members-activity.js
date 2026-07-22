import MembersManagementRoute from './members-management';

export default class MembersActivityRoute extends MembersManagementRoute {
    buildRouteInfoMetadata() {
        return {
            titleToken: 'Activity',
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
