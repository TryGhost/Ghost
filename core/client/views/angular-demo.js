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
        var parseDateFormats = ["DD MMM YY HH:mm", "DD MMM YYYY HH:mm", "DD/MM/YY HH:mm", "DD/MM/YYYY HH:mm",
                "DD-MM-YY HH:mm", "DD-MM-YYYY HH:mm", "YYYY-MM-DD HH:mm"],
            displayDateFormat = 'DD MMM YY @ HH:mm';

        return {
            restrict: 'E',
            templateUrl: '/angular/templates/post-settings-menu.html',
            replace: true,
            scope: {
                klasses: '@class'
            },
            controller: function($scope, BackboneData) {

                $scope.state = {};

                $scope.$watch(BackboneData.getPost, function(post) {
                    if (!post) {
                        $scope.post = {};
                        return;
                    }

                    $scope.post = post.toJSON();

                    var pubDate = 'Not Published';

                    // Insert the published date, and make it editable if it exists.
                    if (post && post.get('published_at')) {
                        $scope.post.published_at = moment(post.get('published_at')).format(displayDateFormat);

                        $scope.state.datePlaceholder = '';
                    } else {
                        $scope.state.datePlaceholder = moment().format(displayDateFormat);
                    }
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
