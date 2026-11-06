const { addTable } = require('../../utils');

// Column order matters: rate-limiter-flexible inserts positionally as (key, points, expire)
module.exports = addTable('rate_limits', {
  key: { type: 'string', maxlength: 191, nullable: false, primary: true },
  points: { type: 'integer', nullable: false, defaultTo: 0 },
  expire: { type: 'bigInteger', nullable: true },
});
