var url = require('url');

function removeDoubleCharacters(character, string) {
    var stringArray = string.split('');

    return stringArray.reduce(function (newString, currentCharacter, index) {
        if (
            currentCharacter === character &&
            stringArray[index + 1] === character
        ) {
            return newString;
        }

        return newString + currentCharacter;
    }, '');
}

function removeOpenRedirectFromUrl(urlString) {
    var parsedUrl = url.parse(urlString);

    return (
        (parsedUrl.protocol ? parsedUrl.protocol + '//' : '') + // http://
        (parsedUrl.auth || '') +
        (parsedUrl.host || '') +
        removeDoubleCharacters('/', parsedUrl.path) +
        (parsedUrl.hash || '')
    );
}

module.exports = removeOpenRedirectFromUrl;
