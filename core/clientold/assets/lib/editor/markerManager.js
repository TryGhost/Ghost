// # Ghost Editor Marker Manager
//
// MarkerManager looks after the array of markers which are attached to image markdown in the editor.
//
// Marker Manager is told by the Upload Manager to add a marker to a line.
// A marker takes the form of a 'magic id' which looks like:
// {<1>}
// It is appended to the start of the given line, and then defined as a CodeMirror 'TextMarker' widget which is
// subsequently added to an array of markers to keep track of all markers in the editor.
// The TextMarker is also set to 'collapsed' mode which means it does not show up in the display.
// Currently, the markers can be seen if you copy and paste your content out of Ghost into a text editor.
// The markers are stripped on save so should not appear in the DB


/*global _, Ghost */

(function () {
    'use strict';

    var imageMarkdownRegex = /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
        markerRegex = /\{<([\w\W]*?)>\}/,
        MarkerManager;

    MarkerManager = function (editor) {
        var markers = {},
            uploadPrefix = 'image_upload',
            uploadId = 1,
            addMarker,
            removeMarker,
            markerRegexForId,
            stripMarkerFromLine,
            findAndStripMarker,
            checkMarkers,
            initMarkers;

        // the regex
        markerRegexForId = function (id) {
            id = id.replace('image_upload_', '');
            return new RegExp('\\{<' + id + '>\\}', 'gmi');
        };

        // Add a marker to the given line
        // Params:
        // line - CodeMirror LineHandle
        // ln - line number
        addMarker = function (line, ln) {
            var marker,
                magicId = '{<' + uploadId + '>}',
                newText = magicId + line.text;

            editor.replaceRange(
                newText,
                {line: ln, ch: 0},
                {line: ln, ch: newText.length}
            );

            marker = editor.markText(
                {line: ln, ch: 0},
                {line: ln, ch: (magicId.length)},
                {collapsed: true}
            );

            markers[uploadPrefix + '_' + uploadId] = marker;
            uploadId += 1;
        };

        // Remove a marker
        // Will be passed a LineHandle if we already know which line the marker is on
        removeMarker = function (id, marker, line) {
            delete markers[id];
            marker.clear();

            if (line) {
                stripMarkerFromLine(line);
            } else {
                findAndStripMarker(id);
            }
        };

        // Removes the marker on the given line if there is one
        stripMarkerFromLine = function (line) {
            var markerText = line.text.match(markerRegex),
                ln = editor.getLineNumber(line);

            if (markerText) {
                editor.replaceRange(
                    '',
                    {line: ln, ch: markerText.index},
                    {line: ln, ch: markerText.index + markerText[0].length}
                );
            }
        };

        // Find a marker in the editor by id & remove it
        // Goes line by line to find the marker by it's text if we've lost track of the TextMarker
        findAndStripMarker = function (id) {
            editor.eachLine(function (line) {
                var markerText = markerRegexForId(id).exec(line.text),
                    ln;

                if (markerText) {
                    ln = editor.getLineNumber(line);
                    editor.replaceRange(
                        '',
                        {line: ln, ch: markerText.index},
                        {line: ln, ch: markerText.index + markerText[0].length}
                    );
                }
            });
        };

        // Check each marker to see if it is still present in the editor and if it still corresponds to image markdown
        // If it is no longer a valid image, remove it
        checkMarkers = function () {
            _.each(markers, function (marker, id) {
                var line;
                marker = markers[id];
                if (marker.find()) {
                    line = editor.getLineHandle(marker.find().from.line);
                    if (!line.text.match(imageMarkdownRegex)) {
                        removeMarker(id, marker, line);
                    }
                } else {
                    removeMarker(id, marker);
                }
            });
        };

        // Add markers to the line if it needs one
        initMarkers = function (line) {
            var isImage = line.text.match(imageMarkdownRegex),
                hasMarker = line.text.match(markerRegex);

            if (isImage && !hasMarker) {
                addMarker(line, editor.getLineNumber(line));
            }
        };

        // Initialise
        editor.eachLine(initMarkers);

        // Public API
        _.extend(this, {
            markers: markers,
            checkMarkers: checkMarkers,
            addMarker: addMarker,
            stripMarkerFromLine: stripMarkerFromLine,
            getMarkerRegexForId: markerRegexForId
        });
    };

    Ghost.Editor = Ghost.Editor || {};
    Ghost.Editor.MarkerManager = MarkerManager;
}());