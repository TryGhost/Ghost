import { createRenameColumnMigration } from '../../utils';

export default createRenameColumnMigration('newsletters', 'show_subtitle', 'show_excerpt');
