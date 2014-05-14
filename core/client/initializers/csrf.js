export default {
    name: 'csrf',

    initialize: function (container) {
        container.register('csrf:current', $('meta[name="csrf-param"]').attr('content'), { instantiate: false });

        container.injection('route', 'csrf', 'csrf:current');
        container.injection('controller', 'csrf', 'csrf:current');
    }
};