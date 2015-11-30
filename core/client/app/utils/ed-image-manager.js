const imageMarkdownRegex = /^!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim;

// Process the markdown content and find all of the locations where there is an image markdown block
function parse(stringToParse) {
    let images = [];
    let m;

    while ((m = imageMarkdownRegex.exec(stringToParse)) !== null) {
        images.push(m);
    }

    return images;
}

// Loop through all dropzones in the preview and find which one was the target of the upload
function getZoneIndex(element) {
    let zones = document.querySelectorAll('.js-entry-preview .js-drop-zone');

    for (let i = 0; i < zones.length; i += 1) {
        if (zones.item(i) === element) {
            return i;
        }
    }

    return -1;
}

// Figure out the start and end of the selection range for the src in the markdown, so we know what to replace
function getSrcRange(content, element) {
    let images = parse(content);
    let index = getZoneIndex(element);
    let replacement = {};

    if (index > -1) {
        // [1] matches the alt test, and 2 matches the url between the ()
        // if the () are missing entirely, which is valid, [2] will be undefined and we'll need to treat this case
        // a little differently
        if (images[index][2] === undefined) {
            replacement.needsParens = true;
            replacement.start = content.indexOf(']', images[index].index) + 1;
            replacement.end = replacement.start;
        } else {
            replacement.start = content.indexOf('(', images[index].index) + 1;
            replacement.end = replacement.start + images[index][2].length;
        }
        return replacement;
    }

    return false;
}

export default {
    getSrcRange
};
