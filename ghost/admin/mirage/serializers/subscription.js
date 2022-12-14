import BaseSerializer from './application';
import {underscore} from '@ember/string';

export default BaseSerializer.extend({
    embed: true,

    include(/*request*/) {
        let includes = [];

        includes.push('tier');

        return includes;
    },

    keyForEmbeddedRelationship(relationshipName) {
        if (relationshipName === 'tier') {
            return 'tier';
        }

        return underscore(relationshipName);
    }

    // NOTE: serialize() is not called for embedded records, serialization happens
    // on the primary resource, in this case `member`
    // TODO: extract subscription serialization and call it here too if we start
    // to treat subscriptions as their own non-embedded resource
});
