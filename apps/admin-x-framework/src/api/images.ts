import {createMutation} from '../utils/api/hooks';

export interface ImagesResponseType {
    images: {
        url: string;
        ref: string | null;
    }[];
}

// eslint-disable-next-line no-shadow
export enum ImageStatus {
    NEW = 'new',
    EDITED = 'edited',
}

export const useUploadImage = createMutation<ImagesResponseType, {file: File, status?: ImageStatus}>({
    method: 'POST',
    path: () => '/images/upload/',
    body: ({file, status = ImageStatus.NEW}) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'image');
        formData.append('status', status);
        return formData;
    }
});

export const getImageUrl = (response: ImagesResponseType) => response.images[0].url;
