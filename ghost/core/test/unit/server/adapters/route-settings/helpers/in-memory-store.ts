import {RouteSettingsStoreBase, type RouteSettings} from '@tryghost/adapter-base-route-settings';

import {buildRouteSettings} from '../../../services/route-settings/route-settings-fixture';

export class InMemoryStore extends RouteSettingsStoreBase {
    private settings: RouteSettings = buildRouteSettings({routes: [], collections: [], taxonomies: {}});

    async get(): Promise<RouteSettings> {
        return structuredClone(this.settings);
    }

    async replace(settings: RouteSettings): Promise<void> {
        this.settings = structuredClone(settings);
    }
}
