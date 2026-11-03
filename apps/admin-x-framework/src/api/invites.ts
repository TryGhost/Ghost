import { InfiniteData } from '@tanstack/react-query';
import { Meta, createMutation, createInfiniteQuery } from '../utils/api/hooks';
import { deleteFromQueryCache, insertToQueryCache } from '../utils/api/update-queries';

export interface UserInvite {
  created_at: string;
  email: string;
  expires: number;
  id: string;
  role_id: string;
  role?: string;
  status: string;
  updated_at: string;
}

export interface InvitesResponseType {
  meta?: Meta;
  invites: UserInvite[];
}

const dataType = 'InvitesResponseType';

export const useBrowseInvites = createInfiniteQuery<InvitesResponseType & { isEnd: boolean }>({
  dataType,
  path: '/invites/',
  permissions: ['Owner', 'Administrator'],
  defaultSearchParams: { limit: '100', include: 'roles' },
  defaultNextPageParams: (lastPage, otherParams) => ({
    ...otherParams,
    page: (lastPage.meta?.pagination.next || 1).toString(),
  }),
  returnData: (originalData) => {
    const { pages } = originalData as InfiniteData<InvitesResponseType>;
    const invites = pages.flatMap((page) => page.invites);
    const meta = pages[pages.length - 1].meta;

    return {
      invites,
      meta,
      isEnd: meta ? meta.pagination.pages === meta.pagination.page : true,
    };
  },
});

type AddInvitePayload = { email: string; roleId: string; replacingId?: string };

export const useAddInvite = createMutation<InvitesResponseType, AddInvitePayload>({
  method: 'POST',
  path: () => '/invites/',
  body: ({ email, roleId }) => ({
    invites: [
      {
        email: email,
        role_id: roleId,
        expires: null,
        status: null,
        token: null,
      },
    ],
  }),
  updateQueries: {
    dataType,
    // Assume that all invite queries should include this new one
    update: (response, current, payload) => {
      const withoutPrevious = payload.replacingId
        ? deleteFromQueryCache<InvitesResponseType, string>('invites')(
            response,
            current,
            payload.replacingId,
          )
        : current;
      return insertToQueryCache<InvitesResponseType>('invites')(response, withoutPrevious);
    },
  },
});

export const useDeleteInvite = createMutation<unknown, string>({
  path: (id) => `/invites/${id}/`,
  method: 'DELETE',
  updateQueries: {
    dataType,
    update: deleteFromQueryCache('invites'),
  },
});
