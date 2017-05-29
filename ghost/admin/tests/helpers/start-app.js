import Application from '../../app';
import config from '../../config/environment';
import fileUpload from './file-upload'; // eslint-disable-line
import registerPowerDatepickerHelpers from '../../tests/helpers/ember-power-datepicker';
import registerPowerSelectHelpers from '../../tests/helpers/ember-power-select';
import run from 'ember-runloop';
import {assign} from 'ember-platform';

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
