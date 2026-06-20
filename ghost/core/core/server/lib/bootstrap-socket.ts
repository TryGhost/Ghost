import net from 'node:net';
import logging from '@tryghost/logging';
import type {JsonValue} from 'type-fest';

type SocketAddress = Readonly<{
    host: string;
    port: number;
}>;

type ConnectOptions = Readonly<{
    tries: number;
}>;

const getErrorCode = (err: unknown): undefined | string => (
    err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
        ? err.code
        : undefined
);

const isValidPort = (port: unknown): port is number => (
    typeof port === 'number' &&
    Number.isInteger(port) &&
    port >= 1 &&
    port <= 65535
);

const hasSocketAddress = (socketAddress?: Partial<SocketAddress>): socketAddress is SocketAddress => (
    typeof socketAddress?.host === 'string' && Boolean(socketAddress.host) &&
    isValidPort(socketAddress.port)
);

export const connectAndSend = (socketAddress?: Partial<SocketAddress>, message?: JsonValue): Promise<void> => {
    // Very basic guard against bad calls
    if (!hasSocketAddress(socketAddress) || !logging || !logging.info || !logging.warn || message === undefined) {
        return Promise.resolve();
    }

    const client = new net.Socket();

    return new Promise((resolve: () => void) => {
        const connect = (options: ConnectOptions) => {
            let wasResolved = false;

            const waitTimeout = setTimeout(() => {
                logging.info('Bootstrap socket timed out.');

                if (!client.destroyed) {
                    client.destroy();
                }

                if (wasResolved) {
                    return;
                }

                wasResolved = true;
                resolve();
            }, 1000 * 5);

            client.connect(socketAddress.port, socketAddress.host, () => {
                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }

                client.write(JSON.stringify(message));

                if (wasResolved) {
                    return;
                }

                wasResolved = true;
                resolve();
            });

            client.on('close', () => {
                logging.info('Bootstrap client was closed.');

                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }
            });

            client.on('error', (err: Error) => {
                logging.warn(`Can't connect to the bootstrap socket (${socketAddress.host} ${socketAddress.port}) ${getErrorCode(err)}.`);

                client.removeAllListeners();

                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }

                if (options.tries < 3) {
                    logging.warn(`Tries: ${options.tries}`);

                    // retry
                    logging.warn('Retrying...');

                    const retryTimeout = setTimeout(() => {
                        clearTimeout(retryTimeout);
                        connect({tries: options.tries + 1});
                    }, 150);
                } else {
                    if (wasResolved) {
                        return;
                    }

                    wasResolved = true;
                    resolve();
                }
            });
        };

        connect({tries: 0});
    });
};
