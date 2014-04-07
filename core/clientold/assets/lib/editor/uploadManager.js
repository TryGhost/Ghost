// # Ghost Editor Upload Manager
//
// UploadManager ensures that markdown gets updated when images get uploaded via the Preview.
//
// The Ghost Editor has a particularly tricky problem to solve, in that it is possible to upload an image by
// interacting with the preview. The process of uploading an image is handled by uploader.js, but there is still
// a lot of work needed to ensure that uploaded files end up in the right place - that is that the image
// path gets added to the correct piece of markdown in the editor.
//
// To solve this, Ghost adds a unique 'marker' to each piece of markdown which represents an image:
// More detail about how the markers work can be find in markerManager.js
//
// UploadManager handles changes in the editor, looking for text which matches image markdown, and telling the marker
// manager to add a marker. It also checks changed lines to see if they have a marker but are no longer an image.
//
// UploadManager's most important job is handling uploads such that when a successful upload completes, the correct
// piece of image markdown is updated with the path.
// This is done in part by ghostImagePreview.js, which takes the marker from the markdown and uses it to create an ID
// on the dropzone. When an upload completes successfully from uploader.js, the event thrown contains reference to the
// dropzone, from which uploadManager can pull the ID & then get the right marker from the Marker Manager.
//
// Without a doubt, the separation of concerns between the uploadManager, and the markerManager could be vastly
// improved


/*global $, _, Ghost */
(function () {
    'use strict';

    var imageMarkdownRegex = /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
        markerRegex = /\{<([\w\W]*?)>\}/,
        UploadManager;

    UploadManager = function (markdown) {
        var editor = markdown.codemirror,
            markerMgr = new Ghost.Editor.MarkerManager(editor),
            findLine,
            checkLine,
            value,
            handleUpload,
            handleChange;

        // Find the line with the marker which matches
        findLine = function (result_id) {
            // try to find the right line to replace
            if (markerMgr.markers.hasOwnProperty(result_id) && markerMgr.markers[result_id].find()) {
                return editor.getLineHandle(markerMgr.markers[result_id].find().from.line);
            }

            return false;
        };

        // Check the given line to see if it has an image, and if it correctly has a marker
        // In the special case of lines which were just pasted in, any markers are removed to prevent duplication
        checkLine = function (ln, mode) {
            var line = editor.getLineHandle(ln),
                isImage = line.text.match(imageMarkdownRegex),
                hasMarker;

            // We care if it is an image
            if (isImage) {
                hasMarker = line.text.match(markerRegex);

                if (hasMarker && (mode === 'paste' || mode === 'undo')) {
                    // this could be a duplicate, and won't be a real marker
                    markerMgr.stripMarkerFromLine(line);
                }

                if (!hasMarker) {
                    markerMgr.addMarker(line, ln);
                }
            }
            // TODO: hasMarker but no image?
        };

        // Get the markdown with all the markers stripped
        value = function () {
            var value = editor.getValue();

            _.each(markerMgr.markers, function (marker, id) {
                /*jshint unused:false*/
                value = value.replace(markerMgr.getMarkerRegexForId(id), '');
            });

            return value;
        };

        // Match the uploaded file to a line in the editor, and update that line with a path reference
        // ensuring that everything ends up in the correct place and format.
        handleUpload = function (e, result_src) {
            var line = findLine($(e.currentTarget).attr('id')),
                lineNumber = editor.getLineNumber(line),
                match = line.text.match(/\([^\n]*\)?/),
                replacement = '(http://)';

            if (match) {
                // simple case, we have the parenthesis
                editor.setSelection(
                    {line: lineNumber, ch: match.index + 1},
                    {line: lineNumber, ch: match.index + match[0].length - 1}
                );
            } else {
                match = line.text.match(/\]/);
                if (match) {
                    editor.replaceRange(
                        replacement,
                        {line: lineNumber, ch: match.index + 1},
                        {line: lineNumber, ch: match.index + 1}
                    );
                    editor.setSelection(
                        {line: lineNumber, ch: match.index + 2},
                        {line: lineNumber, ch: match.index + replacement.length }
                    );
                }
            }
            editor.replaceSelection(result_src);
        };

        // Change events from CodeMirror tell us which lines have changed.
        // Each changed line is then checked to see if a marker needs to be added or removed
        handleChange = function (cm, changeObj) {
            /*jshint unused:false*/
            var linesChanged = _.range(changeObj.from.line, changeObj.from.line + changeObj.text.length);

            _.each(linesChanged, function (ln) {
                checkLine(ln, changeObj.origin);
            });

            // Is this a line which may have had a marker on it?
            markerMgr.checkMarkers();
        };

        // Public API
        _.extend(this, {
            value: value,
            enable: function () {
                var filestorage = $('#entry-markdown-content').data('filestorage');
                $('.js-drop-zone').upload({editor: true, fileStorage: filestorage});
                $('.js-drop-zone').on('uploadstart', markdown.off);
                $('.js-drop-zone').on('uploadfailure', markdown.on);
                $('.js-drop-zone').on('uploadsuccess', markdown.on);
                $('.js-drop-zone').on('uploadsuccess', handleUpload);
            },
            disable: function () {
                $('.js-drop-zone').off('uploadsuccess', handleUpload);
            }
        });

        editor.on('change', handleChange);
    };
    Ghost.Editor = Ghost.Editor || {};
    Ghost.Editor.UploadManager = UploadManager;
}());