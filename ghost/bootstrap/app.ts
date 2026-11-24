/** Ghost's one application. Creating it collects what the providers declare and builds nothing. */
import { createApplication } from '#foundation/application';
import providers from './providers';

export const application = createApplication({ providers });
