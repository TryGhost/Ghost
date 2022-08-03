import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    include(/*request*/) {
        let includes = [];

        includes.push('tags');
        includes.push('authors');

        return includes;
    }
});
