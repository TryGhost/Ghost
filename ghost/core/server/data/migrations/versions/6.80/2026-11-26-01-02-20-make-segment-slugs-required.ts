import { createDropNullableMigration } from '../../utils';

// The migration before this one gave every segment a site already had its slug, and the segments
// service gives each segment it adds one, so every segment has a slug.
export default createDropNullableMigration('segments', 'slug');
