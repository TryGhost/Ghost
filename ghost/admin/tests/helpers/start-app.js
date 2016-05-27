import Ember from 'ember';
import Application from '../../app';
import config from '../../config/environment';
import fileUpload from './file-upload';

const {assign, run} = Ember;

export default function startApp(attrs) {
    let attributes = assign({}, config.APP);
    let application;

    // use defaults, but you can override;
    attributes = assign(attributes, attrs);

    run(function () {
        application = Application.create(attributes);
        application.setupForTesting();
        application.injectTestHelpers();
    });

    return application;
}
