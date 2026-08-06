import config from '../../../shared/config';

/**
 * Where adapters are looked up, in order. Also read by bin/validate-adapters.ts,
 * which checks adapter implementations at build time - keep this the only place
 * the lookup order is declared, so a name resolves there exactly as it does here.
 */
export const adapterPaths: string[] = Array.from(new Set<string>([
    '', // A blank path will cause us to check node_modules for the adapter
    config.get('paths').internalAdaptersPath,

    // custom docker builds may install adapters in a separate path from content,
    // since the content dir is often bind-mounted into the container. Offering
    // an escape hatch here to allow for this
    config.get('paths').installedAdaptersPath ?? '',

    // load adapters from content last, so that they don't override any other
    // internal or platform-installed adapters
    // TODO: potentially deprecate/remove as part of Ghost 7.0
    config.getContentPath('adapters')
]));
