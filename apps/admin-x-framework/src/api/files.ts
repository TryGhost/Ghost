import {createMutation} from '../utils/api/hooks';

export interface FilesResponseType {
    files: {
        url: string;
        ref: string | null;
    }[];
}

export const useUploadFile = createMutation<FilesResponseType, {file: File}>({
    method: 'POST',
    path: () => '/files/upload/',
    body: ({file}) => {
        const formData = new FormData();
        formData.append('file', file);
        return formData;
    }
});

export const getFileUrl = (response: FilesResponseType) => response.files[0].url;
