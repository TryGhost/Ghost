import { combineTransactionalMigrations, removeSetting } from '../../utils';

export default combineTransactionalMigrations(removeSetting('amp'), removeSetting('amp_gtag_id'));
