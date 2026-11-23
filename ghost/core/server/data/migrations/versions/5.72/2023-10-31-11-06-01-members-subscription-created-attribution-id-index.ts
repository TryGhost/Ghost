import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('members_subscription_created_events', ['attribution_id']);
