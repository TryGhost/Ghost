const ghostBookshelf = require('./base');

const CustomThemeSetting = ghostBookshelf.Model.extend({
    tableName: 'custom_theme_settings'
});

module.exports = {
    CustomThemeSetting: ghostBookshelf.model('CustomThemeSetting', CustomThemeSetting)
};
