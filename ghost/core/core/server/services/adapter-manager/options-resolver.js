module.exports = function resolveAdapterOptions(name, adapterServiceConfig) {
    const [adapterType, feature] = name.split(':');
    const adapterSettings = adapterServiceConfig[adapterType];

    let adapterName;
    let adapterConfig;

    const hasFeatureConfig = feature && adapterSettings[feature];
    if (hasFeatureConfig && adapterSettings[adapterSettings[feature]]) {
        // CASE: load resource-specific adapter when there is an adapter feature 
        //       name (String) specified as well as custom feature config
        adapterName = adapterSettings[feature];
        adapterConfig = adapterSettings[adapterName];
    } else if (hasFeatureConfig && adapterSettings[feature].adapter) {
        // CASE: load resource-specific adapter when there is an adapter feature 
        //       name (Object) specified as well as custom feature config
        adapterName = adapterSettings[feature].adapter;
        const commonAdapterConfig = {...adapterSettings[adapterName]};
        const featureAdapterConfig = {...adapterSettings[feature]};
        delete featureAdapterConfig.adapter;
        adapterConfig = {...commonAdapterConfig, ...featureAdapterConfig};
    } else {
        adapterName = adapterSettings.active;
        adapterConfig = adapterSettings[adapterName];
    }

    return {adapterName, adapterConfig};
};
