import {Meta, createQuery} from '../utils/api/hooks';

export type Member = {
    id: string;
    name?: string;
    email?: string;
};

export interface MembersResponseType {
    meta?: Meta
    members: Member[];
}

const dataType = 'MembersResponseType';

export const useBrowseMembers = createQuery<MembersResponseType>({
    dataType,
    path: '/members/'
});
