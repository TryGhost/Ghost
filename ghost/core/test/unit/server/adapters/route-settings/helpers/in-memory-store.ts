import type {RouteSettings} from '../../../../../../core/server/services/route-settings/route-settings-parser';
import type {RouteSettingsStore} from '../../../../../../core/server/adapters/route-settings/RouteSettingsStoreBase';

export class InMemoryStore implements RouteSettingsStore {
    private settings: RouteSettings = {routes: [], collections: [], taxonomies: {}};

    async get(): Promise<RouteSettings> {
        return structuredClone(this.settings);
    }

    async replace(settings: RouteSettings): Promise<void> {
        this.settings = structuredClone(settings);
    }
}
