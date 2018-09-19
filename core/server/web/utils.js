const url = require('url');

const _private = {};

_private.removeDoubleCharacters = (character, string) => {
    const stringArray = string.split('');

    return stringArray.reduce((newString, currentCharacter, index) => {
        if (
            currentCharacter === character &&
            stringArray[index + 1] === character
        ) {
            return newString;
        }

        return `${newString}${currentCharacter}`;
    }, '');
};

module.exports.removeOpenRedirectFromUrl = function removeOpenRedirectFromUrl(urlString) {
    const parsedUrl = url.parse(urlString);

    return (
        // http://
        (parsedUrl.protocol ? parsedUrl.protocol + '//' : '') +
        (parsedUrl.auth || '') +
        (parsedUrl.host || '') +
        _private.removeDoubleCharacters('/', parsedUrl.path) +
        (parsedUrl.hash || '')
    );
};

module.exports.checkFileExists = function checkFileExists(fileData) {
    return !!(fileData.mimetype && fileData.path);
};

module.exports.checkFileIsValid = function checkFileIsValid(fileData, types, extensions) {
    const type = fileData.mimetype;

    if (types.includes(type) && extensions.includes(fileData.ext)) {
        return true;
    }

    return false;
};
