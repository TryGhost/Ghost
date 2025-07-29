// TODO: Remove this file entirely. This hook is just a trivial wrapper that renames properties.
// Components should use useBulkEditLinks from @tryghost/admin-x-framework/api/links directly.

import {useBulkEditLinks as useEditLinksApi} from '@tryghost/admin-x-framework/api/links';

export const useEditLinks = () => {
    const {mutateAsync: editLinks, isLoading: isEditLinksLoading} = useEditLinksApi();

    return {
        editLinks,
        isEditLinksLoading
    };
};