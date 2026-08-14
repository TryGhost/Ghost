// from express-hbs lib/generate-id.js
// Exported so async-resolver.ts can derive its TOKEN_PATTERN character class
// from the same alphabet (single source of truth for the token grammar).
export const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_';

export function generateId(length = 8): string {
    let res = '';
    for (let i = 0; i < length; i++) {
        res += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
    }
    return res;
}
