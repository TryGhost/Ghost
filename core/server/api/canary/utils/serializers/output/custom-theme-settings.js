module.exports = {
    browse(models, apiConfig, frame) {
        frame.response = {
            custom_theme_settings: models
        };
    },

    edit(models, apiConfig, frame) {
        frame.response = {
            custom_theme_settings: models
        };
    }
};
