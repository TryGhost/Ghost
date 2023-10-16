import {Meta, createMutation, createQuery} from '../utils/api/hooks';

export type staffToken = {
    id: string;
    created_at: string;
    integration_id: string | null;
    last_seen_at: string | null;
    last_seen_version: string | null;
    role_id: string;
    secret: string;
    type: string;
    updated_at: string;
    user_id: string;
};

export interface StaffTokenResponseType {
    meta?: Meta
    apiKey: staffToken
}

const dataType = 'StaffTokenResponseType';

export const getStaffToken = createQuery<StaffTokenResponseType>({
    dataType,
    path: '/users/me/token/'
});

export const genStaffToken = createMutation<StaffTokenResponseType, []>({
    path: () => '/users/me/token/',
    method: 'PUT'
});
