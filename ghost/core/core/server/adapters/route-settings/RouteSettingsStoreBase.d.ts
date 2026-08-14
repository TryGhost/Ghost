// PascalCase mirrors the runtime `RouteSettingsStoreBase.js` so the TS adapter
// can default-import via the matching declaration file.
import type {RouteSettings} from '../../services/route-settings/route-settings-parser';

/**
 * Concurrent `replace` calls have no ordering guarantee — serialize
 * externally if that matters.
 */
export interface RouteSettingsStore {
    get(): Promise<RouteSettings>;
    replace(settings: RouteSettings): Promise<void>;
}

declare class RouteSettingsStoreBase {
    readonly requiredFns: ReadonlyArray<string>;
}

export default RouteSettingsStoreBase;
