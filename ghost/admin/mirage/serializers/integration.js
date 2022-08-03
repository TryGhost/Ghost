import BaseSerializer from './application';
import {camelize} from '@ember/string';

export default BaseSerializer.extend({
    embed: true,

    include(request) {
        if (!request.queryParams.include) {
            return;
        }
        return request.queryParams.include.split(',').map(camelize);
    }
});
