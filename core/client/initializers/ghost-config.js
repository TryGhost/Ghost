var ConfigInitializer = {
    name: 'config',

    initialize: function (container, application) {
        var apps = $('body').data('apps'),
            tagsUI = $('body').data('tagsui'),
            fileStorage = $('body').data('filestorage'),
            blogUrl = $('body').data('blogurl'),
            blogTitle = $('body').data('blogtitle');

        application.register(
            'ghost:config', {apps: apps, fileStorage: fileStorage, blogUrl: blogUrl, tagsUI: tagsUI, blogTitle: blogTitle}, {instantiate: false}
        );

        application.inject('route', 'config', 'ghost:config');
        application.inject('controller', 'config', 'ghost:config');
        application.inject('component', 'config', 'ghost:config');
    }
};

export default ConfigInitializer;
