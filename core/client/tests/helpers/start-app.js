import Ember from 'ember';
import Application from '../../app';
import Router from '../../router';
import config from '../../config/environment';

function startApp(attrs) {
    var application,
        attributes = Ember.merge({}, config.APP);

    attributes = Ember.merge(attributes, attrs); // use defaults, but you can override;

    Ember.run(function () {
        application = Application.create(attributes);
        application.setupForTesting();
        application.injectTestHelpers();
    });

    return application;
}

export default startApp;
