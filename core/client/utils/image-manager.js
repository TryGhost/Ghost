// TODO: A better URL regex from markdown-js, need to replace in ghostImagePreview showdown extension as well
//    var urlRegexp = /(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/i.source,
//        imageRegexp = new RegExp("!\\[(.*?)][ \\t]*\\((" + urlRegexp + ")\\)([ \\t])*([\"'].*[\"'])?", 'g');

var imageMarkdownRegex = /^!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim;

// Process the markdown content and find all of the locations where there is an image markdown block
function parse(stringToParse) {
    var m, images = [];
    while ((m = imageMarkdownRegex.exec(stringToParse)) !== null) {
        images.push(m);
    }

    return images;
}

// Loop through all dropzones in the preview and find which one was the target of the upload
function getZoneIndex(element) {
    var zones = document.querySelectorAll('.js-entry-preview .js-drop-zone'),
        i;

    for (i = 0; i < zones.length; i += 1) {
        if (zones.item(i) === element) {
            return i;
        }
    }

    return -1;
}

// Figure out the start and end of the selection range for the src in the markdown, so we know what to replace
function getSrcRange(content, element) {
    var images = parse(content),
        index = getZoneIndex(element),
        replacement = {};

    if (index > -1) {
        replacement.start = content.indexOf('(', images[index].index) + 1;
        replacement.end = replacement.start + images[index][2].length;
        return replacement;
    }

    return false;
}

export default {
    getSrcRange: getSrcRange
};
