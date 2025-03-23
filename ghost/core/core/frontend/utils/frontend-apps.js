const {config} = require('../services/proxy');

function getFrontendAppConfig(app) {
    const appVersion = config.get(`${app}:version`);
    let scriptUrl = config.get(`${app}:url`);
    let stylesUrl = config.get(`${app}:styles`);
    if (typeof scriptUrl === 'string' && scriptUrl.includes('{version}')) {
        scriptUrl = scriptUrl.replace('{version}', appVersion);
    }
    if (typeof stylesUrl === 'string' && stylesUrl?.includes('{version}')) {
        stylesUrl = stylesUrl.replace('{version}', appVersion);
    }
    return {
        scriptUrl,
        stylesUrl,
        appVersion
    };
}

function getDataAttributes(data) {
    let dataAttributes = '';

    if (!data) {
        return dataAttributes;
    }
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined) {
            return;
        }
        dataAttributes += `data-${key}="${value}" `;
    });

    return dataAttributes.trim();
}

module.exports = {getFrontendAppConfig, getDataAttributes};
