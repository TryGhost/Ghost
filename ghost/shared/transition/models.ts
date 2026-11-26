/** The Bookshelf models. Each is bound to one database connection when its file loads. */
import { forSite } from './for-site';

const legacy: Record<string, any> = require('../../core/server/models');

export const models = forSite(legacy);
