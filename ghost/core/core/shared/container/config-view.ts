/**
 * A config view for scoped services: hostSettings comes from the scope's
 * siteConfig, everything else reads deployment config.
 */

type Gettable = {get: (key: string) => unknown};

export const createConfigView = ({siteConfig, deploymentConfig}: {siteConfig: {hostSettings?: unknown}; deploymentConfig: Gettable}): Gettable => ({
    get(key: string) {
        if (key === 'hostSettings') {
            return siteConfig.hostSettings;
        }
        if (key.startsWith('hostSettings:')) {
            return key.split(':').slice(1).reduce<unknown>((value, part) => {
                if (value === undefined || value === null) {
                    return undefined;
                }
                return (value as Record<string, unknown>)[part];
            }, siteConfig.hostSettings);
        }
        return deploymentConfig.get(key);
    }
});
