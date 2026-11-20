import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('members_created_events', ['attribution_id']);
