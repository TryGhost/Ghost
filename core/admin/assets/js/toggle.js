// # Toggle Support

/*global document, jQuery */
(function ($) {
    "use strict";
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
        $('[data-toggle]').each(function () {
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle).hide();
        });

        $('[data-toggle]').on('click', function (e) {
            e.preventDefault();
            $(this).toggleClass('active');
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle).fadeToggle(100).toggleClass('open');
        });

    });
}(jQuery));