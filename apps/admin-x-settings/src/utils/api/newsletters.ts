import {Meta, createMutation, createQuery} from '../apiRequests';
import {Newsletter} from '../../types/api';

export interface NewslettersResponseType {
    meta?: Meta
    newsletters: Newsletter[]
}

const dataType = 'NewslettersResponseType';

export const useBrowseNewsletters = createQuery<NewslettersResponseType>({
    dataType,
    path: '/newsletters/',
    defaultSearchParams: {include: 'count.active_members,count.posts', limit: 'all'}
});

export const useAddNewsletter = createMutation<NewslettersResponseType, Partial<Newsletter> & {opt_in_existing: boolean}>({
    method: 'POST',
    path: () => '/newsletters/',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    body: ({opt_in_existing: _, ...newsletter}) => ({newsletters: [newsletter]}),
    searchParams: payload => ({opt_in_existing: payload.opt_in_existing.toString(), include: 'count.active_members,count.posts', limit: 'all'}),
    updateQueries: {
        dataType,
        update: (newData, currentData) => ({
            ...(currentData as NewslettersResponseType),
            newsletters: (currentData as NewslettersResponseType).newsletters.concat(newData.newsletters)
        })
    }
});

export const useEditNewsletter = createMutation<NewslettersResponseType, Newsletter>({
    method: 'PUT',
    path: newsletter => `/newsletters/${newsletter.id}/`,
    body: newsletter => ({newsletters: [newsletter]}),
    defaultSearchParams: {include: 'count.active_members,count.posts', limit: 'all'},
    updateQueries: {
        dataType,
        update: (newData, currentData) => ({
            ...(currentData as NewslettersResponseType),
            newsletters: (currentData as NewslettersResponseType).newsletters.map((newsletter) => {
                const newNewsletter = newData.newsletters.find(({id}) => id === newsletter.id);
                return newNewsletter || newsletter;
            })
        })
    }
});
