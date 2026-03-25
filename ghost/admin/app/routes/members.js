import MembersManagementRoute from './members-management';

export default class MembersRoute extends MembersManagementRoute {
    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members',
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
