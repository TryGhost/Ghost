import application from '../app';
import { clearDomainTimers } from './schedule';

/**
 * The domain layer boot starts: the application's, which the framework builds
 * from Ghost's foundation, event bus and job scheduling. Boot calls start()
 * after everything it initializes itself and before the job runner starts,
 * then ready() once Ghost is ready.
 */
const layer = application.domains;

export default {
  ...layer,
  async stop() {
    clearDomainTimers();
    await layer.stop();
  },
};
