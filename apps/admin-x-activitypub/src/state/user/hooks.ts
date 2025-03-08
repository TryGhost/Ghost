import {useQuery} from '@tanstack/react-query';

import {createActivityPubAPI, getSiteUrl} from '../util/api';
import {useAccountStore} from '../account/store';
import {useUserStore} from './store';

export function useUserAccount({handle}: {handle: string}) {
    const accountStore = useAccountStore();
    const userStore = useUserStore();

    const query = useQuery({
        queryKey: ['user', 'account', handle],
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getAccount().then((account) => {
                accountStore.add(account);

                userStore.setAccount(account.id);

                return true;
            });
        }
    });

    return {
        account: accountStore.getById(userStore.getAccount() ?? ''),
        isLoading: query.isLoading
    };
}
