import tables from './schema';
import * as inDevelopment from './in-development';
import { validateSchema as validate } from './validator';
import * as views from './views';
import * as commands from './commands';

// Still JavaScript.
const defaultSettings = require('./default-settings');

export { tables, views, commands, inDevelopment, defaultSettings, validate };
