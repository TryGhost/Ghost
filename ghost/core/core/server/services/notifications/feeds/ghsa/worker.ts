import {runWorker} from '../run-worker';
import {runCheck} from '.';
import {notifications} from '../..';

runWorker(() => runCheck(notifications));
