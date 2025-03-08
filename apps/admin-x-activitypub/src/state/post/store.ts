import {type Post} from '../../api/activitypub';
import {createEntityStore} from '../entity-store';

export const usePostStore = createEntityStore<Post>();
