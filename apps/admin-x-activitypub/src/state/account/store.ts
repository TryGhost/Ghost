import {type Account} from '../../api/activitypub';
import {createEntityStore} from '../entity-store';

export const useAccountStore = createEntityStore<Account>();
