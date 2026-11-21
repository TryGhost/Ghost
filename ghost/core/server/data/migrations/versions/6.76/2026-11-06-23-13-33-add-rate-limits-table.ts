import { addTable } from '../../utils';

// Column order matters: rate-limiter-flexible inserts positionally as (key, points, expire)
export default addTable('rate_limits', {
  key: { type: 'string', maxlength: 191, nullable: false, primary: true },
  points: { type: 'integer', nullable: false, defaultTo: 0 },
  expire: { type: 'bigInteger', nullable: true },
  '@@INDEXES@@': [['expire']],
});
