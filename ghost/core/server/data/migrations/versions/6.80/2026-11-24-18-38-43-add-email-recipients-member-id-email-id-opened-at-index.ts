import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('email_recipients', ['member_id', 'email_id', 'opened_at']);
