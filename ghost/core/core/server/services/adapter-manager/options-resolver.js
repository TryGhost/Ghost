/**
 * Resolves full configuration for an adapter. Combining base class configurations
 * along with feature-specific ones
 * 
 * @param {String} name
 * @param {Object} adapterServiceConfig
 * 
 * @returns {{adapterClassName: String, adapterConfig: Object}} 
 */
const resolveAdapterOptions = (name, adapterServiceConfig) => {
    const [adapterType, feature] = name.split(':');
    const adapterSettings = adapterServiceConfig[adapterType];

    let adapterClassName;
    let adapterConfig;

    const hasFeatureConfig = feature && adapterSettings[feature];
    if (hasFeatureConfig && adapterSettings[adapterSettings[feature]]) {
        // CASE: load resource-specific adapter when there is an adapter feature 
        //       name (String) specified as well as custom feature config
        adapterClassName = adapterSettings[feature];
        adapterConfig = adapterSettings[adapterClassName];
    } else if (hasFeatureConfig && adapterSettings[feature].adapter) {
        // CASE: load resource-specific adapter when there is an adapter feature 
        //       name (Object) specified as well as custom feature config
        adapterClassName = adapterSettings[feature].adapter;
        const commonAdapterConfig = {...adapterSettings[adapterClassName]};
        const featureAdapterConfig = {...adapterSettings[feature]};
        delete featureAdapterConfig.adapter;
        adapterConfig = {...commonAdapterConfig, ...featureAdapterConfig};
    } else {
        adapterClassName = adapterSettings.active;
        adapterConfig = adapterSettings[adapterClassName];
    }

    return {adapterClassName, adapterConfig};
};

module.exports = resolveAdapterOptions;
