import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        let includes = [];

        if (request.queryParams.include && request.queryParams.include.indexOf('tags') >= 0) {
            includes.push('tags');
        }

        if (request.queryParams.include && request.queryParams.include.indexOf('authors') >= 0) {
            includes.push('authors');
        }

        return includes;
    }
});
