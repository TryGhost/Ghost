import {createMutation} from '../utils/apiRequests';

export const useTestSlack = createMutation<unknown, null>({
    method: 'POST',
    path: () => '/slack/test/'
});
