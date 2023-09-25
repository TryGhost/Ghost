import {createMutation} from '../utils/api/hooks';

export const useTestSlack = createMutation<unknown, null>({
    method: 'POST',
    path: () => '/slack/test/'
});
