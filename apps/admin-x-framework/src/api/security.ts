import {createMutation} from '../utils/api/hooks';

export interface ResetAuthResponse {
    security_action: Array<{
        action: 'reset_authentication';
        api_keys_rotated: number;
        users_locked: number;
    }>;
}

export const useResetAuth = createMutation<ResetAuthResponse, null>({
    method: 'POST',
    path: () => '/authentication/reset/'
});
