module.exports = {
    browse(models, apiConfig, frame) {
        frame.response = {
            customThemeSettings: models
        };
    },

    edit(models, apiConfig, frame) {
        frame.response = {
            customThemeSettings: models
        };
    }
};
