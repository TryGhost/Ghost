import type {RouteSettings} from '@tryghost/adapter-base-route-settings';

import {serializeRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';

/**
 * Builds a RouteSettings for tests with a real YAML source derived from the
 * structural data (via serializeRouteSettings), so fixtures carry realistic
 * provenance instead of an empty string.
 */
export function buildRouteSettings(settings: Omit<RouteSettings, 'yamlSource'>): RouteSettings {
    return {...settings, yamlSource: serializeRouteSettings(settings)};
}
