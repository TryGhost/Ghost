import {sign} from 'jsonwebtoken';

export class IdentityTokenService {
    constructor(
        private privateKey: string,
        private issuer: string,
        private keyId: string
    ) {}

    async getTokenForUser(email: string, role?: string) {
        const claims: Record<string, string> = {
            sub: email
        };

        if (typeof role === 'string') {
            claims.role = role;
        }

        const token = sign(claims, this.privateKey, {
            issuer: this.issuer,
            expiresIn: '5m',
            algorithm: 'RS256',
            keyid: this.keyId
        });

        return token;
    }
}
