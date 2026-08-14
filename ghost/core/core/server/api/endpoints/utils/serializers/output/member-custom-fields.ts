import {toCustomFieldsResponse} from '../../../../../services/members-custom-fields/serializers';
import type {CustomField} from '../../../../../services/members-custom-fields';

interface Frame {
    response?: unknown;
}

const serializeOne = (field: CustomField, _apiConfig: unknown, frame: Frame): void => {
    frame.response = toCustomFieldsResponse.parse([field]);
};

// module.exports (not export): the API framework loads serializers via require(). The endpoint ->
// serializer mapping lives here; the response shaping lives with the members-custom-fields service.
module.exports = {
    browse(fields: CustomField[], _apiConfig: unknown, frame: Frame): void {
        frame.response = toCustomFieldsResponse.parse(fields);
    },
    read: serializeOne,
    add: serializeOne,
    edit: serializeOne
};
