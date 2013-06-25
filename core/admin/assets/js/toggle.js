// # Toggle Support

/*global document, $, Ghost */
(function () {
    "use strict";

    Ghost.temporary.initToggles = function ($el) {

        $el.find('[data-toggle]').each(function () {
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle).hide();
        });

        $el.find('[data-toggle]').on('click', function (e) {
            e.preventDefault();
            $(this).toggleClass('active');
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle).fadeToggle(100).toggleClass('open');
        });

    };


    $(document).ready(function () {

        // ## Toggle Up In Your Grill
        // Allows for toggling via data-attributes.
        // ### Usage
        //       <nav>
        //         <a href="#" data-toggle=".toggle-me">Toggle</a>
        //         <ul class="toggle-me">
        //            <li>Toggled yo</li>
        //         </ul>
        //       </nav>
        Ghost.temporary.initToggles($(document));
    });

}());