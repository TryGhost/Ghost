/* global generatePassword */

function randomPassword() {
    var word = generatePassword(6),
        randomN   = Math.floor(Math.random() * 1000);

    return word + randomN;
}

export default randomPassword;
