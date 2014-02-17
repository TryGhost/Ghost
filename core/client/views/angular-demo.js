/*global angular */
(function () {
    "use strict";

    angular.module('ghost', []);

    angular.module('ghost').directive('postSettingsMenu', function() {
        return {
            restrict: 'E',
            templateUrl: '/angular/templates/post-settings-menu.html'
        };
    });

}());
