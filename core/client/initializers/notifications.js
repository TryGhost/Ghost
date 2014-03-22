import Notifications from 'ghost/utils/notifications';

var registerNotifications = {
    name: 'registerNotifications',

    initialize: function (container, application) {
        application.register('notifications:main', Notifications);
    }
};

var injectNotifications = {
    name: 'injectNotifications',

    initialize: function (container, application) {
        application.inject('controller', 'notifications', 'notifications:main');
        application.inject('component', 'notifications', 'notifications:main');
        application.inject('route', 'notifications', 'notifications:main');
    }
};

export {registerNotifications, injectNotifications};