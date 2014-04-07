// # Ghost Editor Scroll Handler
//
// Scroll Handler does the (currently very simple / naive) job of syncing the right pane with the left pane
// as the right pane scrolls

/*global Ghost, _ */
(function () {
    'use strict';

    var ScrollHandler = function (markdown, preview) {
        var $markdownViewPort = markdown.scrollViewPort(),
            $previewViewPort = preview.scrollViewPort(),
            $markdownContent = markdown.scrollContent(),
            $previewContent = preview.scrollContent(),
            syncScroll;

        syncScroll = _.throttle(function () {
            // calc position
            var markdownHeight = $markdownContent.height() - $markdownViewPort.height(),
                previewHeight = $previewContent.height() - $previewViewPort.height(),
                ratio = previewHeight / markdownHeight,
                previewPosition = $markdownViewPort.scrollTop() * ratio;

            if (markdown.isCursorAtEnd()) {
                previewPosition = previewHeight + 30;
            }

            // apply new scroll
            $previewViewPort.scrollTop(previewPosition);
        }, 10);

        _.extend(this, {
            enable: function () { // Handle Scroll Events
                $markdownViewPort.on('scroll', syncScroll);
                $markdownViewPort.scrollClass({target: '.entry-markdown', offset: 10});
                $previewViewPort.scrollClass({target: '.entry-preview', offset: 10});
            },
            disable: function () {
                $markdownViewPort.off('scroll', syncScroll);
            }
        });

    };

    Ghost.Editor = Ghost.Editor || {};
    Ghost.Editor.ScrollHandler = ScrollHandler;
} ());