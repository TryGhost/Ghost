import {createMutation} from '../utils/api/hooks';
import {downloadFromEndpoint} from '../utils/helpers';

export const useUploadRoutes = createMutation<unknown, File>({
    method: 'POST',
    path: () => '/settings/routes/yaml/',
    body: (file) => {
        const formData = new FormData();
        formData.append('routes', file);
        return formData;
    }
});

export const downloadRoutes = () => downloadFromEndpoint('/settings/routes/yaml/');
