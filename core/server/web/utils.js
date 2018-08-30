const url = require('url'),
    _ = require('lodash');

let _private = {};

_private.removeDoubleCharacters = function removeDoubleCharacters(character, string) {
    let stringArray = string.split('');

    return stringArray.reduce(function (newString, currentCharacter, index) {
        if (
            currentCharacter === character &&
            stringArray[index + 1] === character
        ) {
            return newString;
        }

        return newString + currentCharacter;
    }, '');
};

module.exports.removeOpenRedirectFromUrl = function removeOpenRedirectFromUrl(urlString) {
    let parsedUrl = url.parse(urlString);

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

    if (_.includes(types, type) && _.includes(extensions, fileData.ext)) {
        return true;
    }
    return false;
};
