// The token is encoded URL safe by replacing '+' with '-', '\' with '_' and removing '='
// NOTE: the token is not encoded using valid base64 anymore
module.exports.encodeBase64 = function encodeBase64(base64String) {
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Decode url safe base64 encoding and add padding ('=')
module.exports.decodeBase64 = function decodeBase64(base64String) {
    base64String = base64String.replace(/-/g, '+').replace(/_/g, '/');
    while (base64String.length % 4) {
        base64String += '=';
    }
    return base64String;
};
