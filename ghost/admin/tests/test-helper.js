import Application from '../app';
import config from '../config/environment';
import loadEmberExam from 'ember-exam/test-support/load';
import registerWaiter from 'ember-raf-scheduler/test-support/register-waiter';
import {setApplication} from '@ember/test-helpers';

loadEmberExam();

setApplication(Application.create(config.APP));

registerWaiter();

mocha.setup({
    timeout: 15000,
    slow: 500
});

