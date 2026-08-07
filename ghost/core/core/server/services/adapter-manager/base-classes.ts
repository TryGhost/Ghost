import {StorageBase} from 'ghost-storage-base';
import {SchedulingBase} from '@tryghost/adapter-base-scheduling';
import {SSOBase} from '@tryghost/adapter-base-sso';
import {CacheBase} from '@tryghost/adapter-base-cache';
import {RedirectsStoreBase} from '@tryghost/adapter-base-redirects';
import {RouteSettingsStoreBase} from '@tryghost/adapter-base-route-settings';
// @ts-expect-error This module lacks type definitions.
import EmailProviderBase from '../../adapters/email/email-provider-base';

import type {BaseClassMap} from './adapter-manager';

/**
 * The base class every adapter of a given type must extend. Also read by
 * bin/validate-adapters.js, which checks adapter implementations at build time -
 * keep this the only place the mapping is declared.
 */
export const baseClasses = {
    storage: StorageBase,
    scheduling: SchedulingBase,
    sso: SSOBase,
    cache: CacheBase,
    email: EmailProviderBase,
    redirects: RedirectsStoreBase,
    'route-settings': RouteSettingsStoreBase
} satisfies BaseClassMap;
