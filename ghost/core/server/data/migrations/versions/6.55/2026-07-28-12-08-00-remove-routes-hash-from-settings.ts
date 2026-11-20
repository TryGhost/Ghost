import { combineTransactionalMigrations, removeSetting } from '../../utils';

export default combineTransactionalMigrations(removeSetting('routes_hash'));
