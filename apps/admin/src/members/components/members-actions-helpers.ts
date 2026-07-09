import {blobDownloadFromEndpoint} from '@tryghost/admin-x-framework/helpers';

export async function exportMembers(filter?: string, search?: string): Promise<void> {
    const params = new URLSearchParams({limit: 'all'});
    if (filter) {
        params.set('filter', filter);
    }
    if (search) {
        params.set('search', search);
    }
    await blobDownloadFromEndpoint(`/members/upload/?${params}`, 'members.csv');
}
