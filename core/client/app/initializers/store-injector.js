var StoreInjector = {
    name: 'store-injector',
    after: 'store',

    initialize: function (container, application) {
        application.inject('component:gh-role-selector', 'store', 'store:main');
        application.inject('component:gh-search-input', 'store', 'store:main');
    }
};

export default StoreInjector;
