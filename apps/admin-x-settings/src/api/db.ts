import {createMutation} from '../utils/apiRequests';

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
