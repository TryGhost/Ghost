var CSRFTokenInitializer = {
    name: 'csrf-token',

    initialize: function (container, application) {
        application.register('csrf:token', $('meta[name="csrf-param"]').attr('content'), { instantiate: false });

        application.inject('route', 'csrf', 'csrf:token');
        application.inject('model', 'csrf', 'csrf:token');
        application.inject('controller', 'csrf', 'csrf:token');
    }
};

export default CSRFTokenInitializer;
