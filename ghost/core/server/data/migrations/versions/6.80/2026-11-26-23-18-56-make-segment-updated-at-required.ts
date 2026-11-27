import { createDropNullableMigration } from '../../utils';

// The migration before this one gave every segment that had never been renamed an `updated_at`,
// and the segments service gives each segment it adds one, so every segment has an `updated_at`.
export default createDropNullableMigration('segments', 'updated_at');
