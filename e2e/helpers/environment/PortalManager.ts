import {execSync, spawn} from 'child_process';
import * as path from 'path';
import logging from '@tryghost/logging';

const DEFAULT_PORT = 4175;
const PORTAL_DIR = path.resolve(__dirname, '..', '..', '..', 'apps', 'portal');

export class PortalManager {
    private readonly port: number;
    private readonly portalDir: string;
    private readonly portalUrl: string;

    constructor(port: number = DEFAULT_PORT, portalDir: string = PORTAL_DIR) {
        this.port = port;
        this.portalDir = portalDir;
        this.portalUrl = `http://localhost:${this.port}/portal.min.js`;
    }

    async start(): Promise<void> {
        if (this.isRunning()) {
            return;
        }

        this.installDependencies();
        this.spawnProcess();
        await this.waitUntilReady();
    }

    async stop(): Promise<void> {
        logging.info('Stopping Portal...');
        await this.killProcess();
        logging.info('Portal stopped');
    }

    private isRunning(): boolean {
        try {
            execSync(`lsof -ti :${this.port}`, {stdio: 'pipe'});
            logging.warn(`Portal is running on port ${this.port}`);
            return true;
        } catch {
            return false;
        }
    }

    private installDependencies(): void {
        try {
            execSync('yarn install', {cwd: this.portalDir, stdio: 'pipe'});
        } catch (error) {
            logging.error('Failed to execute command:', error);
            throw error;
        }
    }

    private spawnProcess(): void {
        logging.info(`Starting Portal on port ${this.port}...`);

        const portalProcess = spawn('yarn', ['preview', '--port', this.port.toString(), '--host', '0.0.0.0'], {
            cwd: this.portalDir,
            detached: true,
            stdio: 'ignore',
            env: {...process.env, NODE_ENV: 'development'}
        });

        portalProcess.unref();
    }

    private async waitUntilReady(timeoutSeconds: number = 60): Promise<void> {
        const deadline = Date.now() + (timeoutSeconds * 1000);

        while (Date.now() < deadline) {
            if (await this.isResponding()) {
                logging.info('Portal started successfully');
                return;
            }
            await this.delay(1000);
        }

        throw new Error(`Portal failed to start within ${timeoutSeconds} seconds`);
    }

    private async isResponding(): Promise<boolean> {
        try {
            const response = await fetch(this.portalUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private async killProcess(): Promise<void> {
        try {
            const pids = execSync(`lsof -ti :${this.port}`, {encoding: 'utf8'}).trim().split('\n');
            for (const pid of pids) {
                if (pid) {
                    process.kill(parseInt(pid, 10), 'SIGKILL');
                    logging.info(`Killed process ${pid} on port ${this.port}`);
                }
            }
        } catch (error) {
            // No processes found on port
        }

        await this.delay(500);
    }

    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
