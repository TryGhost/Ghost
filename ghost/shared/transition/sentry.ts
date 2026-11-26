/** The legacy error reporter. */
import { forSite } from './for-site';

const legacy: {
  captureException(error: unknown, context?: object): void;
} = require('../../core/shared/sentry');

export const sentry = forSite(legacy);
