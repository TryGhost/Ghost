import path from 'node:path';
import {URL} from 'node:url';
import type {Provider} from 'nconf';
import type {BoundHelpers} from '@tryghost/config-url-helpers';

/**
 * The subset of the config instance the helpers read from.
 */
type ConfigLike = Pick<Provider, 'get'>;

/**
 * The config instance once the url helpers have been bound to it.
 */
type ConfigWithUrlHelpers = ConfigLike & BoundHelpers;

/**
 * The set of helper methods that `bindAll` attaches to the config instance.
 */
export interface ConfigHelpers {
    isPrivacyDisabled(privacyFlag: string): boolean;
    getContentPath(type: string): string;
    getBackendMountPath(): string | RegExp;
    getFrontendMountPath(): string | RegExp;
    isTestEnv(): boolean;
    isProductionOrDevelopment(): boolean;
}

const DEFAULT_HOST_ARG = /.*/;

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getHostInfo(config: ConfigWithUrlHelpers) {
    const frontendHost = new URL(config.getSiteUrl()).hostname;

    const adminUrl = config.getAdminUrl();
    const backendHost = adminUrl ? new URL(adminUrl).hostname : '';
    const hasSeparateBackendHost = backendHost && backendHost !== frontendHost;

    return {
        backendHost,
        hasSeparateBackendHost
    };
}

function getBackendMountPath(this: ConfigWithUrlHelpers): string | RegExp {
    const {backendHost, hasSeparateBackendHost} = getHostInfo(this);

    // with a separate admin url only serve on that host, otherwise serve on all hosts
    return (hasSeparateBackendHost) && backendHost ? backendHost : DEFAULT_HOST_ARG;
}

function getFrontendMountPath(this: ConfigWithUrlHelpers): string | RegExp {
    const {backendHost, hasSeparateBackendHost} = getHostInfo(this);

    // with a separate admin url we adjust the frontend vhost to exclude requests to that host, otherwise serve on all hosts
    return (hasSeparateBackendHost && backendHost) ? new RegExp(`^(?!${escapeRegExp(backendHost)}).*`) : DEFAULT_HOST_ARG;
}

function isPrivacyDisabled(this: ConfigLike, privacyFlag: string): boolean {
    if (!this.get('privacy')) {
        return false;
    }

    // CASE: disable all privacy features
    if (this.get('privacy').useTinfoil === true) {
        // CASE: you can still enable single features
        if (this.get('privacy')[privacyFlag] === true) {
            return false;
        }

        return true;
    }

    return this.get('privacy')[privacyFlag] === false;
}

function getContentPath(this: ConfigLike, type: string): string {
    switch (type) {
    case 'images':
        return path.join(this.get('paths:contentPath'), 'images/');
    case 'media':
        return path.join(this.get('paths:contentPath'), 'media/');
    case 'files':
        return path.join(this.get('paths:contentPath'), 'files/');
    case 'themes':
        return path.join(this.get('paths:contentPath'), 'themes/');
    case 'adapters':
        return path.join(this.get('paths:contentPath'), 'adapters/');
    case 'logs':
        return path.join(this.get('paths:contentPath'), 'logs/');
    case 'data':
        return path.join(this.get('paths:contentPath'), 'data/');
    case 'settings':
        return path.join(this.get('paths:contentPath'), 'settings/');
    case 'public':
        return path.join(this.get('paths:contentPath'), 'public/');
    default:
        // new Error is allowed here, as we do not want config to depend on @tryghost/error
        // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
        // eslint-disable-next-line ghost/ghost-custom/no-native-error
        throw new Error('getContentPath was called with: ' + type);
    }
}

function isTestEnv(this: ConfigLike): boolean {
    return this.get('env').startsWith('test');
}

/**
 * env defaults to 'development' when NODE_ENV is unset (see getNodeEnv() in
 * ./utils.ts), matching ghost.js's own `process.env.NODE_ENV = process.env.NODE_ENV
 * || 'development'` at the real CLI entry point — so in any Ghost boot via the
 * normal entry point, this and a raw `process.env.NODE_ENV` check agree. They
 * only diverge for programmatic embedders that require core modules directly
 * without going through ghost.js and never set NODE_ENV themselves — those now
 * count as 'development' (e.g. explore-ping/update-check will phone home)
 * rather than being silently skipped.
 */
function isProductionOrDevelopment(this: ConfigLike): boolean {
    return ['development', 'production'].includes(this.get('env'));
}

export function bindAll(nconf: Provider & BoundHelpers): asserts nconf is Provider & BoundHelpers & ConfigHelpers {
    const target = nconf as Provider & BoundHelpers & ConfigHelpers;
    target.isPrivacyDisabled = isPrivacyDisabled.bind(nconf);
    target.getContentPath = getContentPath.bind(nconf);
    target.getBackendMountPath = getBackendMountPath.bind(nconf);
    target.getFrontendMountPath = getFrontendMountPath.bind(nconf);
    target.isTestEnv = isTestEnv.bind(nconf);
    target.isProductionOrDevelopment = isProductionOrDevelopment.bind(nconf);
}
