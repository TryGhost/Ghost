import baseDebug from '@tryghost/debug';
import express from 'express';
import http from 'http';

export abstract class FakeServer {
    private server: http.Server | null = null;
    protected readonly app: express.Express = express();
    private _port: number;
    protected readonly debug: (...args: unknown[]) => void;

    constructor(options: {port?: number; debugNamespace: string}) {
        this._port = options.port ?? 0;
        this.debug = baseDebug(options.debugNamespace);
        this.app.use((req, _res, next) => {
            this.debug(`${req.method} ${req.originalUrl}`);
            next();
        });
        this.setupRoutes();
    }

    get port(): number {
        return this._port;
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this._port, () => {
                const address = this.server?.address();

                if (!address || typeof address === 'string') {
                    reject(new Error(`${this.constructor.name} did not expose a TCP port`));
                    return;
                }

                this._port = address.port;
                resolve();
            });
            this.server.on('error', reject);
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(() => {
                this.server = null;
                resolve();
            });
        });
    }

    protected abstract setupRoutes(): void;
}
