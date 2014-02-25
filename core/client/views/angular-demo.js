/*global angular */
(function () {
    "use strict";

    // Here we're defining an Angular module.  This is a namespace under which
    // all relevant code resides.
    //
    // Because Angular uses dependency injection as its way of instantiating
    // code every available dependency must be registered in a module.
    //
    // The syntax for defining a module is
    // angular.module('moduleName', ['array', 'of', 'module', 'dependencies']);
    //
    // The syntax for getting a module is angular.module('moduleName') - no second argument.
    angular.module('ghost', []);

    // On an angular module you can define all code that resides there.
    // For a little more thorough introduction please read my blog
    // post I wrote about every type of code you can use in an
    // Angular application: http://blog.harrywolff.com/what-is-angularjs-and-why-is-it-awesome/

    // Here we're defining an Angular Service.  A service is a singleton object
    // that is instantiated when your Angular application starts.
    // Everything defined on the function in the 2nd argument is exposed.
    // This also gives you the ability to easily create private variables
    // as you can see with my usage of `var activePost;`
    angular.module('ghost').service('BackboneData', function() {

        var activePost;

        this.setPost = function(newModel) {
            activePost = newModel;
        };

        this.getPost = function() {
            return activePost;
        };
    });

    // Here we're defining an Angular Directive.
    // The important concept to understand about a directive is Angular's HTML Compiler.
    // When an AnuglarJS application starts up it compiles all HTML that it is given.
    // The Angular HTML Compiler can be programmed to do whatever you want.
    // An Angular Directive is Angular's way of letting you program Angular's HTML Compiler.
    //
    // Here we're defining a 'postSettingsMenu' element.  This definition is given
    // to Angular's HTML Compiler.  So now when it encounters a <post-settings-menu>
    // element it knows how it should behave.
    //
    // The sole aim of a directive is to define how how the HTML Compiler should
    // be programmed.
    angular.module('ghost').directive('postSettingsMenu', function() {
        var parseDateFormats = ["DD MMM YY HH:mm", "DD MMM YYYY HH:mm", "DD/MM/YY HH:mm", "DD/MM/YYYY HH:mm",
                "DD-MM-YY HH:mm", "DD-MM-YYYY HH:mm", "YYYY-MM-DD HH:mm"],
            displayDateFormat = 'DD MMM YY @ HH:mm';

        return {
            // Restricting the HTML Compiler to only recgonize postSettingsMenu
            // directives as an element.
            // Were we to include 'A' the HTML Compiler would also recognize
            // if postSettingsMenu was used as an attribute, like so:
            // <div class="blah" post-settings-menu>.
            restrict: 'E',
            templateUrl: '/angular/templates/post-settings-menu.html',
            // This tells the HTML Compiler to replace the entire element
            // with the template contents.
            replace: true,
            // This scope decleration is making use of the way
            // Angular handles scope throughout an Angular application.
            // Here we tell the HTML Compiler that we want to create
            // an isolated scope for this directive, i.e.
            // that no properties that exist 'above' this element
            // should be accessible to this directive.
            scope: {
                klasses: '@class'
            },
            // An AngularJS controller is where you define what data
            // is accessible in the HTML.
            // Everything you define as an argument of the controller is inflated
            // on instantiated of the controller, due to AngularJS dependency injection
            // i.e. when this controller is created Angular fetches an instance of $scope
            // and the BackboneData service and passes it into the controller for you.
            //
            // The $scope object is special in that everything that is defined on that object
            // is accessible in the HTML.
            controller: function($scope, BackboneData) {

                var post;

                $scope.state = {};

                // The $scope object has a few special functions
                // available on it, one of which is $watch.
                // This function allows you to register an event listener.
                //
                // During every cycle of an Angular application
                // all $watch functions are run.
                //
                // The first argument is a function where you define
                // what property you're looking to see if it changed.
                // In this case we want to know when the `activePost`
                // is changed.
                //
                // When it changes we are passed the new value in the 2nd
                // function where we can do whatever we want with it.
                //
                // In this case we check to see if a new activePost has been set
                // and if so then we attach it to the $scope so the HTML can access it.
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


                // Here we define a function on the $scope object
                // which is accessible in the HTML template.
                // We wrap it in a debounce function for better behavior.
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

                // Another function exposed to the HTML template.
                $scope.deletePost = function() {
                    alert('Delete post');
                };
            }
        };
    });



    // This is not specific to Angular, it's a bridge I created between the
    // Backbone world and the new Angular world.
    // It uses some advanced Angular concepts.
    angular.ghost = {
        injector: function() {
            // Here we're accessing the Angular application from the outside.
            return angular.element(document.getElementsByTagName('html')[0]).injector();
        },
        setPost: function (post) {
            // The invoke() function is how AngularJS' dependency injection works.
            // You pass it in a function with the dependencies defined as arguments
            // and Angular's invoke function will hand that function those dependencies.
            angular.ghost.injector().invoke(function(BackboneData, $rootScope) {
              BackboneData.setPost(post);
              // Because we are modifying the Angular application externally
              // we need to explicitly tell it that changes have occured
              // and that it should commence with a new loop of its run time.
              // $digest() is what lets Angular know that it should run
              // all $watch functions.
              $rootScope.$digest();
            });
        }
    };

}());
