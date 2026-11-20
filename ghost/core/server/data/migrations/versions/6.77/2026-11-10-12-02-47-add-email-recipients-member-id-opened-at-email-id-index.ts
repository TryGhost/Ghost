import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('email_recipients', ['member_id', 'opened_at', 'email_id']);
