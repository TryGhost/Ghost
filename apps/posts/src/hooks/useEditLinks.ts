import {useBulkEditLinks as useEditLinksApi} from '@tryghost/admin-x-framework/api/links';

export const useEditLinks = () => {
    const {mutateAsync: editLinks, isLoading: isEditLinksLoading} = useEditLinksApi();

    return {
        editLinks,
        isEditLinksLoading
    };
};