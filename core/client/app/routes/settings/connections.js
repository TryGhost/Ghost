import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

var SettingsConnectionsRoute = AuthenticatedRoute.extend(styleBody, {
    titleToken: 'Connections',
    classNames: ['settings-view-connections']
});

export default SettingsConnectionsRoute;
