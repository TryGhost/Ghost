import BaseSerializer from './application';

export default BaseSerializer.extend({
    embed: true,

    include() {
        return ['author'];
    }
});
