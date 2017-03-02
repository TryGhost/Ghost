import {assign} from 'ember-platform';
import run from 'ember-runloop';
import Application from '../../app';
import config from '../../config/environment';
import registerPowerSelectHelpers from '../../tests/helpers/ember-power-select';
// eslint-disable-next-line no-unused-vars
import fileUpload from './file-upload';

registerPowerSelectHelpers();

export default function startApp(attrs) {
    let application;

    let attributes = assign({}, config.APP);
    attributes = assign(attributes, attrs); // use defaults, but you can override;

    run(function () {
        application = Application.create(attributes);
        application.setupForTesting();
        application.injectTestHelpers();
    });

    return application;
}
