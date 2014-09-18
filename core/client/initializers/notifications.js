import Notifications from 'ghost/utils/notifications';

var injectNotificationsInitializer = {
    name: 'injectNotifications',
    before: 'authentication',

    initialize: function (container, application) {
        application.register('notifications:main', Notifications);

        application.inject('controller', 'notifications', 'notifications:main');
        application.inject('component', 'notifications', 'notifications:main');
        application.inject('router', 'notifications', 'notifications:main');
        application.inject('route', 'notifications', 'notifications:main');
    }
};

export default injectNotificationsInitializer;
