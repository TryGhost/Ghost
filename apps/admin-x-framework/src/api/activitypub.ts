import {createMutation} from '../utils/api/hooks';

type FollowData = {
    username: string
};

export const useFollow = createMutation<unknown, FollowData>({
    method: 'POST',
    path: data => `/activitypub/follow/${data.username}`
});
