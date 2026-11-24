/** Every provider Ghost registers. A provider only declares, so the order does not matter. */
import legacyServices from '../core/server/services/provider';
import apps from '../domains/apps/provider';

export default [apps, legacyServices];
