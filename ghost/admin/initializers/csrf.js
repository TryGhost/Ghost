var CSRFInitializer = {
    name: 'csrf',

    initialize: function (container, application) {
        application.register('csrf:current', $('meta[name="csrf-param"]').attr('content'), { instantiate: false });

        application.inject('route', 'csrf', 'csrf:current');
        application.inject('controller', 'csrf', 'csrf:current');
    }
};

export default CSRFInitializer;
