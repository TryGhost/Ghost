// EARMARKED. The import path that returns the process-wide database handle.
// It holds nothing: the handle is built and held by Ghost's bootstrap, so this,
// boot and the foundation all hand out the same one. It leaves when its importers
// are handed the database instead.
const { legacyDatabase } = require('../../../../bootstrap/transition/legacy-database');

Object.defineProperty(exports, 'knex', {
  enumerable: true,
  configurable: true,
  get: function get() {
    return legacyDatabase()?.knex;
  },
});

// The same handle as a framework `Database`: its knex, dialect and server.
Object.defineProperty(exports, 'database', {
  enumerable: true,
  configurable: true,
  get: function get() {
    return legacyDatabase();
  },
});
