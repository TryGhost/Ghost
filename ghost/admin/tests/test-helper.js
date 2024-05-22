import Application from 'ghost-admin/app';
import config from 'ghost-admin/config/environment';
import registerWaiter from 'ember-raf-scheduler/test-support/register-waiter';
import start from 'ember-exam/test-support/start';
import {setApplication} from '@ember/test-helpers';

import chai from 'chai';
import chaiDom from 'chai-dom';
chai.use(chaiDom);

// stub loaded external module to avoid loading of external dep
window['@tryghost/koenig-lexical'] = {
    KoenigComposer: () => null,
    KoenigEditor: () => null
};

setApplication(Application.create(config.APP));

registerWaiter();

mocha.setup({
    timeout: 15000,
    slow: 500
});

start();
