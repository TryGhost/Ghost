// from express-hbs lib/generate-id.js
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_';

export function generateId(length = 8): string {
    let res = '';
    for (let i = 0; i < length; i++) {
        res += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return res;
}
