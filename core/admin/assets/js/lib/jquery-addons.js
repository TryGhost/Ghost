/*global $ */
(function() {

    /**
     * Allows to check contents of each element exactly
     * @param obj
     * @param index
     * @param meta
     * @param stack
     * @returns {boolean}
     */
    $.expr[":"].containsExact = function (obj, index, meta, stack) {
        return (obj.textContent || obj.innerText || $(obj).text() || "") === meta[3];
    };

    // ## Toggle Up In Your Grill
    // Allows for toggling via data-attributes.
    // ### Usage
    //       <nav>
    //         <a href="#" data-toggle=".toggle-me">Toggle</a>
    //         <ul class="toggle-me">
    //            <li>Toggled yo</li>
    //         </ul>
    //       </nav>
    $.fn.initToggles = function () {

        $(this).find('[data-toggle]').each(function () {
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle).hide();
        });

        $(this).find('[data-toggle]').on('click', function (e) {
            e.preventDefault();
            $(this).toggleClass('active');
            var toggle = $(this).data('toggle');
            $(this).parent().children(toggle).fadeToggle(100).toggleClass('open');
        });

    };

}());