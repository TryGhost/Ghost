import { createAddColumnMigration } from '../../utils';

// Each segment has a readable slug, which the segments service mints from the segment's name
// when the segment is added. The column starts nullable, so that the next migration can give the
// segments a site already has their slugs before a later one makes the column required. Its
// pattern holds every slug to the format the service mints, and is added in the statement that
// adds the column, so a column that exists has its pattern. The unique index has a migration of
// its own: added here, it would be a second statement, and a run that stopped between the two
// would leave a column that this migration counts as added without its index.
export default createAddColumnMigration(
  'segments',
  'slug',
  {
    type: 'string',
    maxlength: 191,
    nullable: true,
    pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
  },
  { algorithm: 'auto' },
);
