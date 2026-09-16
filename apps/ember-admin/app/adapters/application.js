import EmbeddedRelationAdapter from 'ghost-admin/adapters/embedded-relation-adapter';

export default class Application extends EmbeddedRelationAdapter {
    shouldBackgroundReloadRecord() {
        return false;
    }
}
