import debugModule from '@tryghost/debug';
import express from 'express';
import http from 'http';

const debug = debugModule('metrics-server');

type ServerConfig = {
    host: string;
    port: number;
};

const defaultServerConfig: ServerConfig = {
    host: '0.0.0.0',
    port: 3000
};

const defaultHandler: express.Handler = (req, res) => {
    res.status(501).send('Not Implemented');
};

export class MetricsServer {
    private serverConfig: ServerConfig;
    private app: express.Application | null;
    private httpServer: http.Server | null;
    private handler: express.Handler;

    constructor({serverConfig, handler}: {serverConfig: ServerConfig, handler: express.Handler} = {serverConfig: defaultServerConfig, handler: defaultHandler}) {
        // initialize some local variables
        this.serverConfig = serverConfig;
        this.handler = handler;
        this.app = null;
        this.httpServer = null;
    }

    async start() {
        // start the server
        debug('Starting metrics server');
        this.app = express();
        this.app.get('/metrics', this.handler);
        this.httpServer = this.app.listen(this.serverConfig.port, this.serverConfig.host, () => {
            debug(`Metrics server listening at ${this.serverConfig.host}:${this.serverConfig.port}`);
        });
        return {app: this.app, httpServer: this.httpServer};
    }

    async stop() {
        // stop the server
        debug('Stopping metrics server');
        if (this.httpServer) {
            this.httpServer.close();
        }
    }

    async shutdown() {
        // shutdown the server
        debug('Shutting down metrics server');
        await this.stop();
    }
}