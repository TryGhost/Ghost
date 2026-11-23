import { createApplication } from '#foundry/application';
import { foundation } from './foundation';

/**
 * Ghost, as an application of the framework. This is the one application in the process.
 * Importing it builds nothing and reads nothing.
 */
export default createApplication({ name: 'Ghost', foundation });
