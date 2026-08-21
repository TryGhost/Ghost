const url = require('url');

function removeDoubleCharacters(character, string) {
  const stringArray = string.split('');

  return stringArray.reduce((newString, currentCharacter, index) => {
    if (currentCharacter === character && stringArray[index + 1] === character) {
      return newString;
    }

    return `${newString}${currentCharacter}`;
  }, '');
}

module.exports.removeOpenRedirectFromUrl = function removeOpenRedirectFromUrl(urlString) {
  const parsedUrl = url.parse(urlString);

  return (
    // http://
    (parsedUrl.protocol ? parsedUrl.protocol + '//' : '') +
    (parsedUrl.auth || '') +
    (parsedUrl.host || '') +
    removeDoubleCharacters('/', parsedUrl.path) +
    (parsedUrl.hash || '')
  );
};
