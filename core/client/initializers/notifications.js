import Notifications from 'ghost/utils/notifications';

export default {
    name: 'injectNotifications',

    initialize: function (container, application) {
        application.register('notifications:main', Notifications);

        application.inject('controller', 'notifications', 'notifications:main');
        application.inject('component', 'notifications', 'notifications:main');
        application.inject('route', 'notifications', 'notifications:main');
    }
};