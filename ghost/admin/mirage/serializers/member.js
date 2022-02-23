import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        let queryIncludes = (request.queryParams.include || '').split(',').compact();
        const includes = new Set(queryIncludes);

        // embedded records that are included by default in the API
        includes.add('labels');

        return Array.from(includes);
    }
});
