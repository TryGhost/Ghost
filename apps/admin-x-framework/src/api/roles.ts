import {Meta, createQuery} from '../utils/api/hooks';

export type UserRoleType = 'Owner' | 'Administrator' | 'Editor' | 'Author' | 'Contributor' | 'Super Editor';

export type UserRole = {
    id: string;
    name: UserRoleType;
    description: string;
    created_at: string;
    updated_at: string;
};

export interface RolesResponseType {
    meta?: Meta;
    roles: UserRole[];
}

const dataType = 'RolesResponseType';

export const useBrowseRoles = createQuery<RolesResponseType>({
    dataType,
    path: '/roles/',
    // Ghost has a fixed-by-core number of roles so we know it's less than 100
    defaultSearchParams: {limit: '100'}
});
