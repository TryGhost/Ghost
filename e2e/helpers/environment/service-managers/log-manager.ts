import baseDebug from '@tryghost/debug';
import path from 'path';
import {LOG_CAPTURE} from '@/helpers/environment/constants';
import {promises as fs} from 'fs';
import type {Container} from 'dockerode';

const debug = baseDebug('e2e:LogManager');

export interface LogMetadata {
    testName: string;
    containerId: string;
    startTime: Date;
}

/**
 * Manages log retrieval and formatting from Docker containers for E2E tests
 * Fetches logs on-demand from Docker when tests fail
 */
export class LogManager {
    private readonly outputDir: string;

    constructor(outputDir: string = LOG_CAPTURE.OUTPUT_DIR) {
        this.outputDir = outputDir;
    }

    /**
     * Fetch all logs from a Docker container
     */
    async fetchLogs(container: Container): Promise<string[]> {
        try {
            debug('Fetching logs from container:', container.id);

            const logStream = await container.logs({
                follow: false,
                stdout: true,
                stderr: true,
                timestamps: true
            });

            const logs = this.parseDockerLogs(logStream);
            debug('Fetched logs, total lines:', logs.length);

            return logs;
        } catch (error) {
            debug('Failed to fetch logs:', error);
            return [`Error fetching logs: ${error instanceof Error ? error.message : String(error)}`];
        }
    }

    /**
     * Format logs with test metadata header
     */
    formatLogs(logs: string[], metadata: LogMetadata): string {
        const header = [
            '='.repeat(80),
            `Ghost Server Logs - ${metadata.testName}`,
            `Container: ${metadata.containerId}`,
            `Started: ${metadata.startTime.toISOString()}`,
            `Total Lines: ${logs.length}`,
            '='.repeat(80),
            ''
        ].join('\n');

        return header + logs.join('\n');
    }

    /**
     * Output formatted logs to console
     */
    outputToConsole(formattedLogs: string): void {
        // eslint-disable-next-line no-console
        console.log('\n' + formattedLogs + '\n');
    }

    /**
     * Write logs to a file
     */
    async writeLogsToFile(formattedLogs: string, testName: string): Promise<string> {
        try {
            const logFilePath = await this.getLogFilePath(testName);
            await fs.mkdir(path.dirname(logFilePath), {recursive: true});
            await fs.writeFile(logFilePath, formattedLogs);

            debug('Logs written to:', logFilePath);
            return logFilePath;
        } catch (error) {
            debug('Failed to write logs to file:', error);
            throw error;
        }
    }

    /**
     * Parse Docker's multiplexed log format
     * Docker multiplexes stdout/stderr with 8-byte header: [stream, 0, 0, 0, size(4 bytes)]
     */
    private parseDockerLogs(buffer: Buffer): string[] {
        const logs: string[] = [];
        let offset = 0;

        while (offset < buffer.length) {
            // Check if we have enough bytes for a header
            if (offset + 8 > buffer.length) {
                // Not enough bytes for header, treat remaining as plain text
                const remaining = buffer.subarray(offset).toString('utf-8').trim();
                if (remaining) {
                    logs.push(remaining);
                }
                break;
            }

            // Read size from bytes 4-7 (big-endian uint32)
            const size = buffer.readUInt32BE(offset + 4);

            // Validate size
            if (size === 0 || offset + 8 + size > buffer.length) {
                // Invalid size, try to parse rest as plain text
                const remaining = buffer.subarray(offset).toString('utf-8').trim();
                if (remaining) {
                    logs.push(remaining);
                }
                break;
            }

            // Extract message (skip 8-byte header)
            const message = buffer.subarray(offset + 8, offset + 8 + size).toString('utf-8').trim();
            if (message) {
                logs.push(message);
            }

            offset += 8 + size;
        }

        return logs;
    }

    /**
     * Generate log file path based on test metadata
     */
    private async getLogFilePath(testName: string): Promise<string> {
        const workerId = process.env.TEST_PARALLEL_INDEX || '0';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sanitizedTestName = testName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .substring(0, 100); // Limit filename length

        const fileName = `worker-${workerId}_${timestamp}_${sanitizedTestName}.log`;
        return path.join(this.outputDir, fileName);
    }
}
