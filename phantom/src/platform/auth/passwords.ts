import {randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';

const keyLength = 64;

export const hashPassword = (password: string) => {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, keyLength);
    return `${salt}:${derived.toString('hex')}`;
};

export const verifyPassword = (password: string, hash: string) => {
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
