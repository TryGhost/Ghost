(function(){
    "use strict";

    /**
     * Because I didn't want to write over FancyFirstChar
     */
    var ExampleFilter;

    var ExampleFilter = function(ghost){
        this.ghost = function() {
            return ghost;
        }
    }

    ExampleFilter.prototype.init = function() {

        this.ghost().registerFilter('messWithAdmin', function(adminNavbar){
            console.log('adminnavbar settings run');
            delete adminNavbar.add;
            return adminNavbar;
        });

    };

    module.exports = ExampleFilter;

}());