import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('actions', ['resource_type', 'resource_id']);
