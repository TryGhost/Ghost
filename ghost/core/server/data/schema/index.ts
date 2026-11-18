import tables from './schema';
import * as inDevelopment from './in-development';
import { validateSchema as validate } from './validator';

// Still JavaScript.
const views = require('./views');
const commands = require('./commands');
const defaultSettings = require('./default-settings');

export { tables, views, commands, inDevelopment, defaultSettings, validate };
