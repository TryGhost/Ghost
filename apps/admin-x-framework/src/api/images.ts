import {createMutation} from '../utils/api/hooks';

export interface ImagesResponseType {
    images: {
        url: string;
        ref: string | null;
    }[];
}

export const useUploadImage = createMutation<ImagesResponseType, {file: File}>({
    method: 'POST',
    path: () => '/images/upload/',
    body: ({file}) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'image');
        return formData;
    }
});

export const getImageUrl = (response: ImagesResponseType) => response.images[0].url;
