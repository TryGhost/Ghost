import BaseSerializer from './application';
import {underscore} from '@ember/string';

export default BaseSerializer.extend({
    embed: true,

    include(/*request*/) {
        let includes = [];

        includes.push('productBenefits');

        return includes;
    },

    keyForEmbeddedRelationship(relationshipName) {
        if (relationshipName === 'productBenefits') {
            return 'benefits';
        }

        return underscore(relationshipName);
    }
});
