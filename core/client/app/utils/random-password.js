/* global generatePassword */

export default function () {
    let word = generatePassword(6);
    let randomN   = Math.floor(Math.random() * 1000);

    return word + randomN;
}
