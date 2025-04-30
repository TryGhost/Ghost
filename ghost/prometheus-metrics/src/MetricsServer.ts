import debugModule from '@tryghost/debug';
import express from 'express';
import stoppable from 'stoppable';

const debug = debugModule('metrics-server');

type ServerConfig = {
    host: string;
    port: number;
};

export class MetricsServer {
    private serverConfig: ServerConfig;
    private handler: express.Handler;
    private app: express.Application | null;
    private httpServer: stoppable.StoppableServer | null;
    private isShuttingDown: boolean;

    constructor({serverConfig, handler}: {serverConfig: ServerConfig, handler: express.Handler}) {
        // initialize local variables
        this.serverConfig = serverConfig;
        this.handler = handler;
        this.app = null;
        this.httpServer = null;
        this.isShuttingDown = false;
    }

    async start() {
        // start the server
        debug('Starting metrics server');
        this.app = express();
        this.app.get('/metrics', this.handler);
        const httpServer = this.app.listen(this.serverConfig.port, this.serverConfig.host, () => {
            debug(`Metrics server listening at ${this.serverConfig.host}:${this.serverConfig.port}`);
        });
        this.httpServer = stoppable(httpServer, 0);

        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
        return {app: this.app, httpServer: this.httpServer};
    }

    async stop() {
        // stop the server
        debug('Stopping metrics server');
        if (this.httpServer && this.httpServer.listening) {
            await this.httpServer.stop();
        }
    }

    async shutdown() {
        if (this.isShuttingDown) {
            return;
        }
        this.isShuttingDown = true;
        await this.stop();
        this.isShuttingDown = false;
    }
}