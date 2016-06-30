import {assign} from 'ember-platform';
import run from 'ember-runloop';
import Application from '../../app';
import config from '../../config/environment';
import fileUpload from './file-upload';

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
