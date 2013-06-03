/*global window, document, Ghost, Backbone, $, _ */
(function () {
    "use strict";

    var $widgetContainer = $('#widget-container'), $itemElems;

    $widgetContainer.packery({
        itemSelector: '[data-type="widget"]',
        gutter: 10,
        columnWidth: 340,
        rowHeight: 300
    });

    $itemElems = $($widgetContainer.packery('getItemElements'));
    // make item elements draggable
    $itemElems.draggable();
    // bind Draggable events to Packery
    $widgetContainer.packery('bindUIDraggableEvents', $itemElems);

    $(".size-options-container").on("click", function () {
        var $parent = $(this).closest('[data-type="widget"]'), data = $(this).data('size');

        $parent.removeClass("widget-1x2 widget-2x1 widget-2x2");

        if (data !== "1x1") {
            $parent.addClass('widget-' + data);
            $widgetContainer.packery('fit', $parent.get(0));
        } else {
            $widgetContainer.packery();
        }

        $(this).siblings('.active').removeClass('active');
        $(this).addClass('active');

    });

}());