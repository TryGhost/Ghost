import {Meta, createQuery} from '../utils/apiRequests';

export type Member = {
    id: string;
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
