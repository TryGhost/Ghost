import { Meta } from '../utils/api/hooks';
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
export declare const useBrowseRoles: ({ searchParams, ...query }?: import("@tanstack/react-query").UseQueryOptions<RolesResponseType, unknown, RolesResponseType, import("@tanstack/query-core").QueryKey> & {
    searchParams?: Record<string, string>;
    defaultErrorHandler?: boolean;
}) => Omit<import("@tanstack/react-query").UseQueryResult<RolesResponseType>, "data"> & {
    data: RolesResponseType | undefined;
};
