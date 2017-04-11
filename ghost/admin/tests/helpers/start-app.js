import {assign} from 'ember-platform';
import run from 'ember-runloop';
import Application from '../../app';
import config from '../../config/environment';
import registerPowerSelectHelpers from '../../tests/helpers/ember-power-select';
import registerPowerDatepickerHelpers from '../../tests/helpers/ember-power-datepicker';
// eslint-disable-next-line no-unused-vars
import fileUpload from './file-upload';

registerPowerSelectHelpers();
registerPowerDatepickerHelpers();

export default function startApp(attrs) {
    let attributes = assign({}, config.APP);
    attributes = assign(attributes, attrs); // use defaults, but you can override;

    return run(() => {
        let application = Application.create(attributes);
        application.setupForTesting();
        application.injectTestHelpers();
        return application;
    });
}
