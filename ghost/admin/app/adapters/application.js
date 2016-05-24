import EmbeddedRelationAdapter from 'ghost-admin/adapters/embedded-relation-adapter';

export default EmbeddedRelationAdapter.extend({

    shouldBackgroundReloadRecord() {
        return false;
    }

});
