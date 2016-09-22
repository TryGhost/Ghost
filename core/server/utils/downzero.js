// Functions to imitate the behavior of Downsize@0.0.5 with 'words: "0"' (heavily based on Downsize)

var stack, tagName, tagBuffer, truncatedText, parseState, pointer,
    states = {unitialized: 0, tag_commenced: 1, tag_string: -1, tag_string_single: -2, comment: -3},
    voidElements = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
    'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

function getTagName(tag) {
    var tagName = (tag || '').match(/<\/*([a-z0-9\:\-\_]+)/i);
    return tagName ? tagName[1] : null;
}

function closeTag(openingTag) {
    var tagName = (getTagName(openingTag)) ? '</' + getTagName(openingTag) + '>' : '';
    return tagName;
}

function downzero(text) {
    stack = [];
    tagName = '';
    tagBuffer = '';
    truncatedText = '';
    parseState = 0;
    pointer = 0;

    for (; pointer < text.length; pointer += 1) {
        if (parseState !== states.unitialized) {
            tagBuffer += text[pointer];
        }

        switch (text[pointer]) {
            case '<':
                if (parseState === states.unitialized && text[pointer + 1].match(/[a-z0-9\-\_\/\!]/)) {
                    parseState = states.tag_commenced;
                    tagBuffer += text[pointer];
                }

                break;
            case '!':
                if (parseState === states.tag_commenced && text[pointer - 1] === '<') {
                    parseState = states.comment;
                }

                break;
            case '\"':
                if (parseState === states.tag_string) {
                    parseState = states.tag_commenced;
                } else if (parseState === states.tag_string_single) {
                    // if double quote is found in a single quote string, ignore it and let the string finish
                    break;
                } else if (parseState !== states.unitialized) {
                    parseState = states.tag_string;
                }

                break;
            case '\'':
                if (parseState === states.tag_string_single) {
                    parseState = states.tag_commenced;
                } else if (parseState === states.tag_string) {
                    break;
                } else if (parseState !== states.unitialized) {
                    parseState = states.tag_string_single;
                }

                break;
            case '>':
                if (parseState === states.tag_commenced) {
                    parseState = states.unitialized;
                    truncatedText += tagBuffer;
                    tagName = getTagName(tagBuffer);

                    if (tagBuffer.match(/<\s*\//) && getTagName(stack[stack.length - 1]) === tagName) {
                        stack.pop();
                    } else if (voidElements.indexOf(tagName) < 0 && !tagBuffer.match(/\/\s*>$/)) {
                        stack.push(tagBuffer);
                    }
                    tagBuffer = '';

                    continue;
                }

                if (parseState === states.comment && text.substring(pointer - 2, pointer) === '--') {
                    parseState = states.unitialized;
                    truncatedText += tagBuffer;
                    tagBuffer = '';

                    continue;
                }

                break;
            case '-':
                break;
        }

        if (!parseState) {
            break;
        }
    }

    truncatedText += tagBuffer;

    while (stack.length) {
        truncatedText += closeTag(stack.pop());
    }

    return truncatedText;
}

module.exports = downzero;
