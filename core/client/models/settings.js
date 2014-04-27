/*global Ghost, _ */
(function () {
    'use strict';
    //id:0 is used to issue PUT requests
    Ghost.Models.Settings = Ghost.ProgressModel.extend({
        url: Ghost.paths.apiRoot + '/settings/?type=blog,theme,app',
        id: '0',

        parse: function (response) {
            var result = _.reduce(response.settings, function (settings, setting) {
                settings[setting.key] = setting.value;

                return settings;
            }, {});

            return result;
        }
    });

}());
