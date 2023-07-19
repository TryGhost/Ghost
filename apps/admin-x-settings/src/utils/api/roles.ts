import {Meta, createQuery} from '../apiRequests';
import {UserRole} from '../../types/api';

export interface RolesResponseType {
    meta?: Meta;
    roles: UserRole[];
}

const dataType = 'RolesResponseType';

export const useBrowseRoles = createQuery<RolesResponseType>({
    dataType,
    path: '/roles/',
    defaultSearchParams: {limit: 'all'}
});
