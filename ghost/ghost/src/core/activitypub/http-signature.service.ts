import crypto from 'node:crypto';

type Signature = {
    signature: Buffer
    headers: string[]
    keyId: URL
    algorithm: string
};

export class HTTPSignature {
    private static generateSignatureString(
        signature: Signature,
        headers: Headers,
        requestMethod: string,
        requestUrl: string
    ): string {
        const data = signature.headers
            .map((header) => {
                return `${header}: ${this.getHeader(
                    header,
                    headers,
                    requestMethod,
                    requestUrl
                )}`;
            })
            .join('\n');

        return data;
    }

    private static parseSignatureHeader(signature: string): Signature {
        const signatureData: Record<string, string> = signature
            .split(',')
            .reduce((data, str) => {
                try {
                    const [key, value] = str.split('=');
                    return {
                        // values are wrapped in quotes like key="the value"
                        [key]: value.replace(/"/g, ''),
                        ...data
                    };
                } catch (err) {
                    return data;
                }
            }, {});

        if (
            !signatureData.signature ||
            !signatureData.headers ||
            !signatureData.keyId ||
            !signatureData.algorithm
        ) {
            throw new Error('Could not parse signature');
        }

        return {
            keyId: new URL(signatureData.keyId),
            headers: signatureData.headers.split(/\s/),
            signature: Buffer.from(signatureData.signature, 'base64url'),
            algorithm: signatureData.algorithm
        };
    }

    private static getHeader(
        header: string,
        headers: Headers,
        requestMethod: string,
        requestUrl: string
    ) {
        if (header === '(request-target)') {
            return `${requestMethod.toLowerCase()} ${requestUrl}`;
        }
        if (!headers.has(header)) {
            throw new Error(`Missing Header ${header}`);
        }
        return headers.get(header);
    }

    protected static async getPublicKey(keyId: URL): Promise<crypto.KeyObject> {
        try {
            const keyRes = await fetch(keyId, {
                headers: {
                    Accept: 'application/ld+json'
                }
            });

            // This whole thing is wrapped in try/catch so we can just cast as we want and not worry about errors
            const json = (await keyRes.json()) as {
                publicKey: { publicKeyPem: string };
            };

            const key = crypto.createPublicKey(json.publicKey.publicKeyPem);
            return key;
        } catch (err) {
            throw new Error(`Could not find public key ${keyId.href}: ${err}`);
        }
    }

    private static validateDigest(
        signatureData: Signature,
        requestBody: Buffer,
        requestHeaders: Headers
    ) {
        const digest = crypto
            .createHash(signatureData.algorithm)
            .update(requestBody)
            .digest('base64');

        const parts = requestHeaders.get('digest')?.split('=');
        parts?.shift();
        const remoteDigest = parts?.join('=');

        return digest === remoteDigest;
    }

    static async validate(
        requestMethod: string,
        requestUrl: string,
        requestHeaders: Headers,
        requestBody: Buffer = Buffer.alloc(0, 0)
    ) {
        const signatureHeader = requestHeaders.get('signature');
        if (typeof signatureHeader !== 'string') {
            throw new Error('Invalid Signature header');
        }
        const signatureData = this.parseSignatureHeader(signatureHeader);

        if (requestMethod.toLowerCase() === 'post') {
            const digestIsValid = this.validateDigest(
                signatureData,
                requestBody,
                requestHeaders
            );
            if (!digestIsValid) {
                return false;
            }
        }

        const publicKey = await this.getPublicKey(signatureData.keyId);
        const signatureString = this.generateSignatureString(
            signatureData,
            requestHeaders,
            requestMethod,
            requestUrl
        );

        const verified = crypto
            .createVerify(signatureData.algorithm)
            .update(signatureString)
            .verify(publicKey, signatureData.signature);

        return verified;
    }

    static async sign(
        request: Request,
        keyId: URL,
        privateKey: crypto.KeyObject
    ): Promise<Request> {
        let headers;
        if (request.method.toLowerCase() === 'post') {
            headers = ['(request-target)', 'host', 'date', 'digest'];
        } else {
            headers = ['(request-target)', 'host', 'date'];
        }
        const signatureData: Signature = {
            signature: Buffer.alloc(0, 0),
            headers,
            keyId,
            algorithm: 'rsa-sha256'
        };
        const url = new URL(request.url);
        const requestHeaders = new Headers(request.headers);
        if (!requestHeaders.has('host')) {
            requestHeaders.set('host', url.host);
        }
        if (!requestHeaders.has('date')) {
            requestHeaders.set('date', (new Date()).toUTCString());
        }
        if (request.method.toLowerCase() === 'post') {
            const digest = crypto
                .createHash(signatureData.algorithm)
                .update(Buffer.from(await request.clone().text(), 'utf8'))
                .digest('base64');

            requestHeaders.set('digest', `${signatureData.algorithm}=${digest}`);
        }
        const signatureString = this.generateSignatureString(
            signatureData,
            requestHeaders,
            request.method,
            url.pathname
        );
        const signature = crypto
            .createSign(signatureData.algorithm)
            .update(signatureString)
            .sign(privateKey)
            .toString('base64');

        requestHeaders.set(
            'Signature',
            `keyId="${keyId}",headers="${headers.join(' ')}",signature="${signature}",algorithm="${signatureData.algorithm}"`
        );

        return new Request(request, {
            headers: requestHeaders
        });
    }
}
