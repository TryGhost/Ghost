import {toCustomFieldsResponse} from '../../../../../services/members-custom-fields/serializers';
import type {CustomField} from '../../../../../services/members-custom-fields';

interface Frame {
    response?: unknown;
}

const serializeOne = (field: CustomField, _apiConfig: unknown, frame: Frame): void => {
    frame.response = toCustomFieldsResponse.parse([field]);
};

const serializeMany = (fields: CustomField[], _apiConfig: unknown, frame: Frame): void => {
    frame.response = toCustomFieldsResponse.parse(fields);
};

// module.exports (not export): the API framework loads serializers via require(). The endpoint ->
// serializer mapping lives here; the response shaping lives with the members-custom-fields service.
module.exports = {
    browse: serializeMany,
    read: serializeOne,
    // Create is a batch, so it returns every definition it made. The response is
    // already an array, so a one-item create looks exactly as it did before.
    add: serializeMany,
    edit: serializeOne
};
