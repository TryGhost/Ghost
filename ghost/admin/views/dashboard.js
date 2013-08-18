/*global window, document, localStorage, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    var Widgets,
        Widget,
        WidgetContent,
        $widgetContainer,
        $itemElems,
        widgetPositions;

    widgetPositions = {
        mobile: {},
        tablet: {},
        netbook: {},
        desktop: {}
    };

    // Base view
    // ----------
    Ghost.Views.Dashboard = Ghost.View.extend({
        initialize: function (options) {
            this.addSubview(new Widgets({ el: '.js-widget-container', collection: this.collection })).render();
        }
    });

    // Widgets
    // ----------
    Widgets = Ghost.View.extend({
        initialize: function () {
            $widgetContainer = this.$el;
        },

        packeryInit: function () {
            var self = this;
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

            $widgetContainer.packery('on', 'dragItemPositioned', function () {
                var viewportSize = $(window).width();
                if (viewportSize <= 400) { // Mobile
                    widgetPositions.mobile = self.getWidgetOrder($itemElems);
                } else if (viewportSize > 400 && viewportSize <= 800) { // Tablet
                    widgetPositions.tablet = self.getWidgetOrder($itemElems);
                } else if (viewportSize > 800 && viewportSize <= 1000) { // Netbook
                    widgetPositions.netbook = self.getWidgetOrder($itemElems);
                } else if (viewportSize > 1000) {
                    widgetPositions.desktop = self.getWidgetOrder($itemElems);
                }
                localStorage.setItem('widgetPositions', JSON.stringify(widgetPositions));

                // Retrieve the object from storage with `JSON.parse(localStorage.getItem('widgetPositions'));`
            });
        },

        getWidgetOrder: function (itemElems) {
            // items are in order within the layout
            var order = {};

            _.each(itemElems, function (widget, index) {
                order[widget.getAttribute("data-widget-id")] = index;
            });
            return order;
        },

        render: function () {
            this.collection.each(function (model) {
                this.$el.append(this.addSubview(new Widget({model: model})).render().el);
            }, this);
            this.packeryInit();
        }

    });

    // Widget
    // ----------
    Widget = Ghost.View.extend({

        tagName: 'article',
        attributes: function () {
            var size = (this.model.get('size')) ? " widget-" + this.model.get('size') : "",
                settings = (this.model.attributes.settings.enabled) ? " widget-settings" : "";

            return {
                'class': 'widget-' + this.model.get('name') + size + settings + ' js-widget',
                'data-widget-id': this.model.get('applicationID')
            };
        },

        events: {
            'click .js-widget-resizer': 'resizeWidget',
            'click .js-view-settings': 'showSettings',
            'click .js-view-widget': 'showWidget'
        },

        resizeWidget: function (e) {
            e.preventDefault();
            var data = $(e.currentTarget).data('size');

            this.$el.removeClass("widget-1x2 widget-2x1 widget-2x2");

            if (data !== "1x1") {
                this.$el.addClass('widget-' + data);
                $widgetContainer.packery('fit', this.el);
            } else {
                $widgetContainer.packery();
            }

            $(e.currentTarget).siblings('.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        },

        showSettings: function (e) {
            e.preventDefault();
            this.model.attributes.settings.enabled = true;
            this.$el.addClass("widget-settings");
            this.render();
        },

        showWidget: function (e) {
            e.preventDefault();
            this.model.attributes.settings.enabled = false;
            this.$el.removeClass("widget-settings");
            this.render();
        },

        templateName: "widget",

        afterRender: function () {
            if (!this.model.attributes.settings.enabled) {
                this.$(".widget-content").html(this.addSubview(new WidgetContent({model: this.model})).render().el);
            } else {
                var size = !this.model.get('size') ? "1x1" : this.model.get('size');
                this.$el.find("[data-size='" + size + "']").addClass('active');
            }
            return this;
        }

    });

    // Widget Content
    // ----------
    WidgetContent = Ghost.View.extend({

        template: function (data) {
            return JST['widgets/' + this.model.attributes.content.template](data);
        }

    });

}());