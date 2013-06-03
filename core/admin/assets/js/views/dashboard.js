/*global window, document, localStorage, Ghost, Backbone, $, _ */
(function () {
    "use strict";

    var $widgetContainer = $('.js-widget-container'), $itemElems, widgetPositions;

    widgetPositions = {
        mobile: {},
        tablet: {},
        netbook: {},
        desktop: {}
    };

    $widgetContainer.packery({
        itemSelector: '.js-widget',
        gutter: 10,
        columnWidth: 340,
        rowHeight: 300
    });

    $itemElems = $($widgetContainer.packery('getItemElements'));
    // make item elements draggable
    $itemElems.draggable();
    // bind Draggable events to Packery
    $widgetContainer.packery('bindUIDraggableEvents', $itemElems);

    // show item order after layout
    function orderItems() {
        // items are in order within the layout
        var $itemElems = $($widgetContainer.packery('getItemElements')), order = {};

        $.each($itemElems, function (index, key) {
            order[key.getAttribute("data-widget-id")] = index;
        });
        return order;
    }

    // On resize button click
    $(".js-widget-resizer").on("click", function () {
        var $parent = $(this).closest('.js-widget'), data = $(this).data('size');

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

    $widgetContainer.packery('on', 'dragItemPositioned', function () {
        var viewportSize = $(window).width();
        if (viewportSize <= 400) { // Mobile
            widgetPositions.mobile = orderItems();
        } else if (viewportSize > 400 && viewportSize <= 800) { // Tablet
            widgetPositions.tablet = orderItems();
        } else if (viewportSize > 800 && viewportSize <= 1000) {  // Netbook
            widgetPositions.netbook = orderItems();
        } else if (viewportSize > 1000) {
            widgetPositions.desktop = orderItems();
        }
        localStorage.setItem('widgetPositions', JSON.stringify(widgetPositions));

        // Retrieve the object from storage with `JSON.parse(localStorage.getItem('widgetPositions'));`
    });

}());