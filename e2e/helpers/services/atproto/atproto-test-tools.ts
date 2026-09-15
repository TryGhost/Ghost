/* eslint-disable ghost/sort-imports-es6-autofix/sort-imports-es6 */
import {spawnSync} from 'node:child_process';
import {generateKeyPairSync, randomBytes, randomUUID} from 'node:crypto';
import http, {type IncomingMessage, type Server} from 'node:http';
import knex, {type Knex} from 'knex';

export interface AtprotoTokenResponse {
    access_token: string;
    token_type?: string;
    sub: string;
    email?: string;
    email_verified?: boolean;
}

export interface AtprotoStateOptions {
    did: string;
    tokenEndpoint: string;
    asIssuer: string;
    redirectUrl?: string | null;
    stateId?: string;
}

export function createAtprotoTestDb(database: string): Knex {
    return knex({
        client: 'mysql2',
        connection: {
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: 'root',
            database
        }
    });
}

export async function insertAtprotoOAuthState(db: Knex, options: AtprotoStateOptions): Promise<string> {
    const {privateKey} = generateKeyPairSync('ec', {namedCurve: 'P-256'});
    const stateId = options.stateId ?? randomBytes(32).toString('hex');
    const privateKeyJwk = JSON.stringify(privateKey.export({format: 'jwk'}));
    const pkceVerifier = randomBytes(32).toString('base64url');

    const values = {
        id: stateId,
        pkce_verifier: pkceVerifier,
        dpop_private_key_jwk: privateKeyJwk,
        resolved_did: options.did,
        pds_token_endpoint: options.tokenEndpoint,
        as_issuer: options.asIssuer,
        redirect_url: options.redirectUrl ?? null,
        email_required: false,
        expires_at: formatMysqlDateTime(new Date(Date.now() + 10 * 60 * 1000))
    };

    await writeAtprotoStateRow(db, values);

    return stateId;
}

function escapeMysql(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatMysqlDateTime(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function writeAtprotoStateRow(db: Knex, values: Record<string, string | boolean | null>): Promise<void> {
    const database = db.client.config.connection && typeof db.client.config.connection === 'object'
        ? (db.client.config.connection as {database?: string}).database
        : null;

    if (!database) {
        throw new Error('ATProto state write requires a database name');
    }

    const sql = [
        'INSERT INTO atproto_oauth_states (id, pkce_verifier, dpop_private_key_jwk, resolved_did, pds_token_endpoint, as_issuer, redirect_url, email_required, expires_at)',
        `VALUES ('${escapeMysql(String(values.id))}', '${escapeMysql(String(values.pkce_verifier))}', '${escapeMysql(String(values.dpop_private_key_jwk))}', '${escapeMysql(String(values.resolved_did))}', '${escapeMysql(String(values.pds_token_endpoint))}', '${escapeMysql(String(values.as_issuer))}', ${values.redirect_url === null ? 'NULL' : `'${escapeMysql(String(values.redirect_url))}'`}, ${values.email_required ? 'true' : 'false'}, '${escapeMysql(String(values.expires_at))}')`,
        'ON DUPLICATE KEY UPDATE',
        'pkce_verifier = VALUES(pkce_verifier),',
        'dpop_private_key_jwk = VALUES(dpop_private_key_jwk),',
        'resolved_did = VALUES(resolved_did),',
        'pds_token_endpoint = VALUES(pds_token_endpoint),',
        'as_issuer = VALUES(as_issuer),',
        'redirect_url = VALUES(redirect_url),',
        'email_required = VALUES(email_required),',
        'expires_at = VALUES(expires_at);'
    ].join(' ');

    const result = spawnSync('docker', ['exec', '-i', 'ghost-dev-mysql', 'mysql', '-uroot', '-proot', database], {
        input: `${sql}\n`,
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        throw new Error(`Failed to seed ATProto state row: ${result.stderr || result.stdout}`);
    }
}

export class MockAtprotoTokenServer {
    private server: Server | null = null;
    private port: number | null = null;
    private readonly responses = new Map<string, AtprotoTokenResponse>();

    async start(): Promise<void> {
        this.server = http.createServer((req, res) => {
            void this.handleRequest(req, res);
        });

        await new Promise<void>((resolve) => {
            this.server?.listen(0, '0.0.0.0', resolve);
        });

        const address = this.server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Failed to start mock ATProto token server');
        }

        this.port = address.port;
    }

    async stop(): Promise<void> {
        if (!this.server) {
            return;
        }

        await new Promise<void>((resolve) => {
            this.server?.close(() => resolve());
        });

        this.server = null;
        this.port = null;
        this.responses.clear();
    }

    setTokenResponse(code: string, response: AtprotoTokenResponse): void {
        this.responses.set(code, response);
    }

    get issuer(): string {
        if (!this.port) {
            throw new Error('Mock ATProto token server is not running');
        }

        return `http://host.docker.internal:${this.port}`;
    }

    get tokenEndpoint(): string {
        return `${this.issuer}/oauth/token`;
    }

    private async handleRequest(req: IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (req.method !== 'POST' || req.url !== '/oauth/token') {
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'not_found'}));
            return;
        }

        const body = await this.readBody(req);
        const params = new URLSearchParams(body);
        const code = params.get('code');

        if (!code) {
            res.writeHead(400, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'missing_code'}));
            return;
        }

        const response = this.responses.get(code);
        if (!response) {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'missing_mock_response'}));
            return;
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(response));
    }

    private async readBody(req: IncomingMessage): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];

            req.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            req.on('end', () => {
                resolve(Buffer.concat(chunks).toString('utf8'));
            });
            req.on('error', reject);
        });
    }
}