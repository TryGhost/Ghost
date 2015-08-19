/* global generatePassword */

export default function () {
    var word = generatePassword(6),
        randomN   = Math.floor(Math.random() * 1000);

    return word + randomN;
}
