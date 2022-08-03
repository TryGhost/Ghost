import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class WhatsnewRoute extends AuthenticatedRoute {
    buildRouteInfoMetadata() {
        return {
            titleToken: `What's new?`
        };
    }
}
