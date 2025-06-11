// Shared content configuration for all apps using shade
// This ensures consistent class availability across micro frontends

module.exports = {
    // Shade's own components
    shadeComponents: [
        '../../node_modules/@tryghost/shade/es/**/*.{js,ts,jsx,tsx}'
    ],

    // All consumer apps - add new apps here when they start using shade
    consumerApps: [
        '../posts/src/**/*.{js,ts,jsx,tsx}',
        '../stats/src/**/*.{js,ts,jsx,tsx}',
        '../admin-x-activitypub/src/**/*.{js,ts,jsx,tsx}'
    ],

    // Get all content paths for an app
    getAllContent: function (appSpecificPaths = []) {
        return [
            ...appSpecificPaths,
            ...this.shadeComponents,
            ...this.consumerApps
        ];
    }
};
