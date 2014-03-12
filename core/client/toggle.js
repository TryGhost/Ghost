// # Toggle Support

/*global document, $, Ghost */
(function () {
    'use strict';

    Ghost.temporary.hideToggles = function () {
        $('[data-toggle]').each(function () {
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle + ':visible').fadeOut();
        });

        // Toggle active classes on menu headers
        $('[data-toggle].active').removeClass('active');
    };

    Ghost.temporary.initToggles = function ($el) {

        $el.find('[data-toggle]').each(function () {
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle).hide();
        });

        $el.find('[data-toggle]').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var $this = $(this),
                toggle = $this.data('toggle'),
                isAlreadyActive = $this.is('.active');

            // Close all the other open toggle menus
            Ghost.temporary.hideToggles();

            if (!isAlreadyActive) {
                $this.toggleClass('active');
                $(this).parent().children(toggle).toggleClass('open').fadeToggle(200);
            }
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
