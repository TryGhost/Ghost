/*global angular */
(function () {
    "use strict";

    angular.module('ghost', []);

    angular.module('ghost').service('BackboneData', function() {

        var activePost;

        this.setPost = function(newModel) {
            activePost = newModel;
        };

        this.getPost = function() {
            return activePost;
        };
    });

    angular.module('ghost').directive('postSettingsMenu', function() {
        return {
            restrict: 'E',
            templateUrl: '/angular/templates/post-settings-menu.html',
            controller: function($scope, BackboneData) {

                $scope.$watch(BackboneData.getPost, function(post) {
                    $scope.post = post ? post.toJSON() : {};
                });
            }
        };
    });



    // Helpers to bridge angular and Backbone

    angular.ghost = {
        injector: function() {
            return angular.element(document.getElementsByTagName('html')[0]).injector();
        },
        setPost: function (post) {
            angular.ghost.injector().invoke(function(BackboneData, $rootScope) {
              BackboneData.setPost(post);
              $rootScope.$digest();
            });
        }
    };

}());
