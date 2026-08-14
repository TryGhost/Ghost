import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import {
    DEV_ENVIRONMENT,
    EGRESS_ALLOWLIST,
    EGRESS_COREFILE_PATH,
    EGRESS_DNS_IMAGE,
    TEST_ENVIRONMENT
} from '@/helpers/environment/constants';
import {dirname} from 'path';
import {mkdir, writeFile} from 'fs/promises';
import type {Container} from 'dockerode';

const debug = baseDebug('e2e:EgressMonitor');

export interface EgressQuery {
    /** Hostname that was resolved (lowercased, no trailing dot) */
    name: string;
    /** Record type, e.g. A / AAAA */
    type: string;
    /** Source container IP that issued the lookup */
    client?: string;
}

export interface EgressMonitorConfig {
    workerIndex: number;
}

// CoreDNS logs each forwarded query via the `log` plugin with an EGRESS sentinel
// (see the Corefile): `[INFO] EGRESS <client> <type> <name>.`
const EGRESS_LINE = /EGRESS (\S+) (\S+) (\S+)/;

/**
 * Observes outbound DNS resolution from the Ghost container in e2e tests.
 *
 * A CoreDNS sidecar runs on the dev network. Pointing Ghost's `HostConfig.Dns` at
 * it makes the sidecar the upstream (ExtServer) of Ghost's embedded resolver, so
 * Docker keeps resolving internal service names (mysql, redis, …) itself and only
 * forwards EXTERNAL names to the sidecar. CoreDNS forwards those on to Docker's
 * embedded resolver and logs them, so its output is a clean record of every
 * external host Ghost reached out to — regardless of which HTTP client made the
 * call, and including arbitrary hostnames (e.g. webmention targets pulled from
 * post content).
 *
 * The sidecar uses a dedicated, pinned CoreDNS image — deliberately NOT the Ghost
 * application image (which is the production artifact) — pulled at runtime through
 * the CI registry mirror.
 *
 * The monitor is fail-open: if the sidecar can't start, callers must NOT override
 * Ghost's DNS (doing so without a working resolver would break the whole suite).
 */
export class EgressMonitor {
    private readonly docker: Docker;
    private readonly config: EgressMonitorConfig;
    private readonly containerName: string;
    private container: Container | null = null;
    private serverIp: string | null = null;

    constructor(docker: Docker, config: EgressMonitorConfig) {
        this.docker = docker;
        this.config = config;
        this.containerName = `ghost-e2e-egress-worker-${config.workerIndex}`;
    }

    /** IP the Ghost container should use as its DNS server, or null if unavailable. */
    get dnsServerIp(): string | null {
        return this.serverIp;
    }

    get isActive(): boolean {
        return this.serverIp !== null;
    }

    /**
     * Start the sidecar and resolve its network IP. Never throws — on failure it
     * logs and leaves the monitor inactive so the caller falls back to normal DNS.
     */
    async start(): Promise<void> {
        try {
            await this.ensureImage();
            this.container = await this.getOrCreate();
            // Only expose the IP once CoreDNS has actually started. Ghost is pointed
            // at this DNS server immediately after, so returning early would let its
            // first lookups race the bind and fail.
            await this.waitForListening(this.container);
            this.serverIp = await this.resolveIp(this.container);
            debug(`Egress monitor ready for worker ${this.config.workerIndex} at ${this.serverIp}`);
        } catch (error) {
            debug('Egress monitor failed to start; continuing without DNS monitoring:', error);
            this.container = null;
            this.serverIp = null;
        }
    }

    /** Pull the CoreDNS image if it isn't already present on the host. */
    private async ensureImage(): Promise<void> {
        try {
            await this.docker.getImage(EGRESS_DNS_IMAGE).inspect();
            return;
        } catch {
            // Not present locally — pull it below.
        }
        const stream = await this.docker.pull(EGRESS_DNS_IMAGE);
        await new Promise<void>((resolve, reject) => {
            this.docker.modem.followProgress(stream, err => (err ? reject(err) : resolve()));
        });
    }

    /**
     * Wait until CoreDNS has logged its startup banner (it prints `CoreDNS-<ver>`
     * once it is serving). Throws on timeout so start() stays fail-open and the
     * caller falls back to Docker's default resolver.
     */
    private async waitForListening(container: Container, timeoutMs = 10000): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const buffer = await container.logs({stdout: true, stderr: true, follow: false, timestamps: false});
            if (buffer.toString('utf8').includes('CoreDNS-')) {
                return;
            }
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
        }
        throw new Error('Egress monitor sidecar did not start in time');
    }

    private async getOrCreate(): Promise<Container> {
        const existing = this.docker.getContainer(this.containerName);
        try {
            const info = await existing.inspect();
            if (info.State.Running) {
                return existing;
            }
            await existing.start();
            return existing;
        } catch (error) {
            const statusCode = (error as {statusCode?: number})?.statusCode;
            const message = error instanceof Error ? error.message : String(error);
            if (statusCode !== 404 && !/No such container/i.test(message)) {
                throw error;
            }
        }

        const container = await this.docker.createContainer({
            name: this.containerName,
            Image: EGRESS_DNS_IMAGE,
            Cmd: ['-conf', '/Corefile'],
            // TTY keeps `container.logs()` output un-multiplexed (raw lines).
            Tty: true,
            // The CoreDNS image runs as nonroot by default; port 53 needs root.
            User: '0:0',
            HostConfig: {
                Binds: [`${EGRESS_COREFILE_PATH}:/Corefile:ro`],
                ExtraHosts: ['host.docker.internal:host-gateway']
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [DEV_ENVIRONMENT.networkName]: {Aliases: [this.containerName]}
                }
            },
            Labels: {
                // Same project label as Ghost/gateway so cleanupAllContainers() removes it.
                'com.docker.compose.project': TEST_ENVIRONMENT.projectNamespace,
                'tryghost/e2e': 'egress-monitor'
            }
        });
        await container.start();
        return container;
    }

    private async resolveIp(container: Container): Promise<string> {
        const info = await container.inspect();
        const networks = info.NetworkSettings?.Networks ?? {};
        const endpoint = networks[DEV_ENVIRONMENT.networkName] ?? Object.values(networks)[0];
        const ip = endpoint?.IPAddress;
        if (!ip) {
            throw new Error('Egress monitor container has no network IP');
        }
        return ip;
    }

    /** Parse every query CoreDNS has logged so far. */
    async readQueries(): Promise<EgressQuery[]> {
        if (!this.container) {
            return [];
        }
        const buffer = await this.container.logs({stdout: true, stderr: true, follow: false, timestamps: false});
        const queries: EgressQuery[] = [];
        for (const line of buffer.toString('utf8').split('\n')) {
            const match = line.match(EGRESS_LINE);
            if (match) {
                queries.push({
                    client: match[1],
                    type: match[2],
                    name: match[3].replace(/\.$/, '').toLowerCase()
                });
            }
        }
        return queries;
    }

    /**
     * Read every query the container has resolved, briefly polling for the CoreDNS
     * log to settle first. Outbound pings are often fire-and-forget, so a late
     * lookup from the final test can land just after it finishes; the settle window
     * waits for the log to stop growing before returning. Runs once per worker at
     * teardown — not per test — so this cost is paid a single time.
     */
    async collectSettled({settleMs = 400, maxWaitMs = 1500} = {}): Promise<EgressQuery[]> {
        const deadline = Date.now() + maxWaitMs;
        let previous = await this.readQueries();
        let lastGrowth = Date.now();
        while (Date.now() < deadline) {
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
            const current = await this.readQueries();
            if (current.length > previous.length) {
                previous = current;
                lastGrowth = Date.now();
            } else if (Date.now() - lastGrowth >= settleMs) {
                // Stable for the full settle window — no more late lookups expected.
                break;
            }
        }
        return previous;
    }

    /**
     * External hosts the container resolved that are NOT on the allowlist, as a
     * sorted, de-duplicated list.
     */
    async unexpectedHosts(opts?: {settleMs?: number; maxWaitMs?: number}): Promise<string[]> {
        const queries = await this.collectSettled(opts);
        const hosts = queries.map(query => query.name).filter(host => !isAllowedHost(host));
        return [...new Set(hosts)].sort();
    }

    /** Persist the full query log as a JSON artifact for inspection. */
    async writeArtifact(filePath: string): Promise<void> {
        const queries = await this.readQueries();
        await mkdir(dirname(filePath), {recursive: true});
        await writeFile(filePath, JSON.stringify(queries, null, 2));
    }

    async stop(): Promise<void> {
        if (!this.container) {
            return;
        }
        try {
            await this.container.remove({force: true});
        } catch (error) {
            debug('Failed to remove egress monitor container:', error);
        }
        this.container = null;
        this.serverIp = null;
    }
}

/**
 * A host is "allowed" if it matches an allowlist entry exactly, is a subdomain of
 * one, or is a reverse-DNS (PTR) lookup. Everything else counts as external egress.
 */
export function isAllowedHost(host: string): boolean {
    const name = host.toLowerCase().replace(/\.$/, '');
    if (!name || name.endsWith('.arpa')) {
        return true;
    }
    return EGRESS_ALLOWLIST.some(allowed => name === allowed || name.endsWith(`.${allowed}`));
}
