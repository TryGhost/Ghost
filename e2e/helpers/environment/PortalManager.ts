import {execSync, spawn} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import logging from '@tryghost/logging';

const DEFAULT_PORT = 4175;
const PORTAL_DIR = path.resolve(__dirname, '..', '..', '..', 'apps', 'portal');

export class PortalManager {
    private readonly port: number;

    constructor(port: number = DEFAULT_PORT) {
        this.port = port;
    }

    async start(): Promise<void> {
        if (this.isPortalRunning()) {
            logging.warn(`Portal already running on port ${this.port}`);
            return;
        }

        this.ensurePortalExists();
        this.installDependencies();

        logging.info(`Starting Portal on port ${this.port}...`);

        this.spawnPortalProcess();
        await this.waitUntilReady();

        logging.info('Portal started successfully');
    }

    async stop(): Promise<void> {
        logging.info('Stopping Portal...');

        this.killPortalProcess();
        await this.delay(500);

        logging.info('Portal stopped');
    }

    getUrl(): string {
        return `http://localhost:${this.port}`;
    }

    private isPortalRunning(): boolean {
        try {
            execSync(`lsof -ti :${this.port}`, {stdio: 'pipe'});
            return true;
        } catch {
            return false;
        }
    }

    private ensurePortalExists(): void {
        if (!fs.existsSync(PORTAL_DIR)) {
            throw new Error(`Portal not found at: ${PORTAL_DIR}`);
        }
    }

    private installDependencies(): void {
        execSync('yarn install', {cwd: PORTAL_DIR, stdio: 'pipe'});
    }

    private spawnPortalProcess(): void {
        const portalProcess = spawn('yarn', ['preview', '--port', this.port.toString(), '--host', '0.0.0.0'], {
            cwd: PORTAL_DIR,
            detached: true,
            stdio: 'ignore',
            env: {...process.env, NODE_ENV: 'development'}
        });

        portalProcess.unref();
    }

    private async waitUntilReady(timeoutSeconds: number = 60): Promise<void> {
        const url = `${this.getUrl()}/portal.min.js`;
        const deadline = Date.now() + (timeoutSeconds * 1000);

        while (Date.now() < deadline) {
            if (await this.isPortalResponding(url)) {
                return;
            }
            await this.delay(1000);
        }

        throw new Error(`Portal failed to start within ${timeoutSeconds} seconds`);
    }

    private async isPortalResponding(url: string): Promise<boolean> {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private killPortalProcess(): void {
        try {
            const pids = execSync(`lsof -ti :${this.port}`, {encoding: 'utf8'}).trim().split('\n');
            for (const pid of pids) {
                if (pid) {
                    process.kill(parseInt(pid, 10), 'SIGKILL');
                    logging.info(`Killed process ${pid} on port ${this.port}`);
                }
            }
        } catch {
            // No processes found on port
        }
    }

    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
