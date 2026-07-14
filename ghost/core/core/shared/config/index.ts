import {loadNconf} from './loader';

// Consumed throughout Ghost via `require('shared/config')` as the config
// instance itself, so we assign the singleton straight to module.exports
// rather than using `export =` (disallowed under erasableSyntaxOnly).
module.exports = loadNconf();
