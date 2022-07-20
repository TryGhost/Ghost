module.exports = function resolveAdapterOptions(name, adapterServiceConfig) {
    const [adapterType, feature] = name.split(':');
    const adapterSettings = adapterServiceConfig[adapterType];

    let adapterName;
    let adapterConfig;

    // CASE: load resource-specific adapter when there is an adapter feature name specified as well as custom feature config
    if (feature && adapterSettings[feature] && adapterSettings[adapterSettings[feature]]) {
        adapterName = adapterSettings[feature];
        adapterConfig = adapterSettings[adapterName];
    } else {
        adapterName = adapterSettings.active;
        adapterConfig = adapterSettings[adapterName];
    }

    return {adapterType, adapterName, adapterConfig};
};
