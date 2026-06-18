import {randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import bcrypt from 'bcryptjs';

const keyLength = 64;

// Staff imported from current-day Ghost carry bcrypt hashes; phantom-native
// accounts use scrypt.
const isBcryptHash = (hash: string) => /^\$2[aby]\$/.test(hash);

export const hashPassword = (password: string) => {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, keyLength);
    return `${salt}:${derived.toString('hex')}`;
};

export const verifyPassword = (password: string, hash: string) => {
    if (isBcryptHash(hash)) {
        return bcrypt.compareSync(password, hash);
    }

    const [salt, stored] = hash.split(':');
    if (!salt || !stored) {
        return false;
    }

    const derived = scryptSync(password, salt, keyLength);
    const storedBuffer = Buffer.from(stored, 'hex');

    if (storedBuffer.length !== derived.length) {
        return false;
    }

    return timingSafeEqual(storedBuffer, derived);
};
