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

                var post;

                $scope.state = {};

                /*
                    We see when the post has been set,
                    and when it is we assign it to our $scope object
                    which is accessible in the template.
                 */
                $scope.$watch(BackboneData.getPost, function(p) {
                    post = p;

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


                /*
                    Save Post

                    Called by all input fields when their data changes.

                    It's properly debounced.
                 */
                $scope.savePost = _.debounce(function() {
                    console.log('Properly debounced');

                    $scope.post.published_at = moment($scope.post.published_at, parseDateFormats);

                    // Save new 'Published' date
                    post.save($scope.post, {
                        success : function (model) {
                            $scope.post.published_at = moment(model.get('published_at')).format(displayDateFormat);
                            Ghost.notifications.addItem({
                                type: 'success',
                                message: 'Date successfully changed',
                                status: 'passive'
                            });
                        },
                        error : function (model, xhr) {
                            /*jslint unparam:true*/
                            //  Reset back to original value
                            $scope.post.published_at = moment(post.get('published_at')).format(displayDateFormat);
                            Ghost.notifications.addItem({
                                type: 'error',
                                message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                                status: 'passive'
                            });
                        }
                    });

                }, 300);

                /*
                    Delete post
                 */
                $scope.deletePost = function() {
                    alert('Delete post');
                };
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
