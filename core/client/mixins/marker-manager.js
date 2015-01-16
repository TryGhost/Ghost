var MarkerManager = Ember.Mixin.create({
    imageMarkdownRegex: /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
    markerRegex: /\{<([\w\W]*?)>\}/,

    uploadId: 1,

    // create an object that will be shared amongst instances.
    // makes it easier to use helper functions in different modules
    markers: {},

    // Add markers to the line if it needs one
    initMarkers: function (line) {
        var imageMarkdownRegex = this.get('imageMarkdownRegex'),
            markerRegex = this.get('markerRegex'),
            editor = this.get('codemirror'),
            isImage = line.text.match(imageMarkdownRegex),
            hasMarker = line.text.match(markerRegex);

        if (isImage && !hasMarker) {
            this.addMarker(line, editor.getLineNumber(line));
        }
    },

    // Get the markdown with all the markers stripped
    getMarkdown: function (value) {
        var marker, id,
            editor = this.get('codemirror'),
            markers = this.get('markers'),
            markerRegexForId = this.get('markerRegexForId'),
            oldValue = value || editor.getValue(),
            newValue = oldValue;

        for (id in markers) {
            if (markers.hasOwnProperty(id)) {
                marker = markers[id];
                newValue = newValue.replace(markerRegexForId(id), '');
            }
        }

        return {
            withMarkers: oldValue,
            withoutMarkers: newValue
        };
    },

    // check the given line to see if it has an image, and if it correctly has a marker
    // in the special case of lines which were just pasted in, any markers are removed to prevent duplication
    checkLine: function (ln, mode) {
        var editor = this.get('codemirror'),
            line = editor.getLineHandle(ln),
            imageMarkdownRegex = this.get('imageMarkdownRegex'),
            markerRegex = this.get('markerRegex'),
            isImage = line.text.match(imageMarkdownRegex),
            hasMarker;

        // We care if it is an image
        if (isImage) {
            hasMarker = line.text.match(markerRegex);

            if (hasMarker && (mode === 'paste' || mode === 'undo')) {
                // this could be a duplicate, and won't be a real marker
                this.stripMarkerFromLine(line);
            }

            if (!hasMarker) {
                this.addMarker(line, ln);
            }
        }
        // TODO: hasMarker but no image?
    },

    // Add a marker to the given line
    // Params:
    // line - CodeMirror LineHandle
    // ln - line number
    addMarker: function (line, ln) {
        var marker,
            markers = this.get('markers'),
            editor = this.get('codemirror'),
            uploadPrefix = 'image_upload',
            uploadId = this.get('uploadId'),
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
        this.set('uploadId', uploadId += 1);
    },

    // Check each marker to see if it is still present in the editor and if it still corresponds to image markdown
    // If it is no longer a valid image, remove it
    checkMarkers: function () {
        var id, marker, line,
            editor = this.get('codemirror'),
            markers = this.get('markers'),
            imageMarkdownRegex = this.get('imageMarkdownRegex');

        for (id in markers) {
            if (markers.hasOwnProperty(id)) {
                marker = markers[id];

                if (marker.find()) {
                    line = editor.getLineHandle(marker.find().from.line);
                    if (!line.text.match(imageMarkdownRegex)) {
                        this.removeMarker(id, marker, line);
                    }
                } else {
                    this.removeMarker(id, marker);
                }
            }
        }
    },

    // this is needed for when we transition out of the editor.
    // since the markers object is persistent and shared between classes that
    // mix in this mixin, we need to make sure markers don't carry over between edits.
    clearMarkers: function () {
        var markers = this.get('markers'),
            id,
            marker;

        // can't just `this.set('markers', {})`,
        // since it wouldn't apply to this mixin,
        // but only to the class that mixed this mixin in
        for (id in markers) {
            if (markers.hasOwnProperty(id)) {
                marker = markers[id];
                delete markers[id];
                marker.clear();
            }
        }
    },

    // Remove a marker
    // Will be passed a LineHandle if we already know which line the marker is on
    removeMarker: function (id, marker, line) {
        var markers = this.get('markers');

        delete markers[id];
        marker.clear();

        if (line) {
            this.stripMarkerFromLine(line);
        } else {
            this.findAndStripMarker(id);
        }
    },

    // Removes the marker on the given line if there is one
    stripMarkerFromLine: function (line) {
        var editor = this.get('codemirror'),
            ln = editor.getLineNumber(line),

            markerRegex = /\{<([\w\W]*?)>\}/,

            markerText = line.text.match(markerRegex);

        if (markerText) {
            editor.replaceRange(
                '',
                {line: ln, ch: markerText.index},
                {line: ln, ch: markerText.index + markerText[0].length}
            );
        }
    },

    // the regex
    markerRegexForId: function (id) {
        id = id.replace('image_upload_', '');
        return new RegExp('\\{<' + id + '>\\}', 'gmi');
    },

    // Find a marker in the editor by id & remove it
    // Goes line by line to find the marker by it's text if we've lost track of the TextMarker
    findAndStripMarker: function (id) {
        var self = this,
            editor = this.get('codemirror');

        editor.eachLine(function (line) {
            var markerText = self.markerRegexForId(id).exec(line.text),
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
    },

    // Find the line with the marker which matches
    findLine: function (resultId) {
        var editor = this.get('codemirror'),
            markers = this.get('markers');

        // try to find the right line to replace
        if (markers.hasOwnProperty(resultId) && markers[resultId].find()) {
            return editor.getLineHandle(markers[resultId].find().from.line);
        }

        return false;
    }
});

export default MarkerManager;
