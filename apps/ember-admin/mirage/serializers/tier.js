import BaseSerializer from './application';
import {underscore} from '@ember/string';

export default BaseSerializer.extend({
    embed: true,

    include(/*request*/) {
        let includes = [];

        includes.push('tierBenefits');

        return includes;
    },

    keyForEmbeddedRelationship(relationshipName) {
        if (relationshipName === 'tierBenefits') {
            return 'benefits';
        }

        return underscore(relationshipName);
    }
});
