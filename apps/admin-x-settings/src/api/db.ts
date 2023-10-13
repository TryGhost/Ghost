import {createMutation} from '../utils/api/hooks';
import {downloadFromEndpoint} from '../utils/helpers';

export const useImportContent = createMutation<unknown, File>({
    method: 'POST',
    path: () => '/db/',
    body: (file) => {
        const formData = new FormData();
        formData.append('importfile', file);
        return formData;
    }
});

export const useDeleteAllContent = createMutation<unknown, null>({
    method: 'DELETE',
    path: () => '/db/'
});

export const downloadAllContent = () => downloadFromEndpoint('/db/');
