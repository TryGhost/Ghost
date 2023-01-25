import {preview} from 'vite';

export const E2E_PORT = process.env.E2E_PORT || 3000;

let server;

export async function setup() {
    server = await preview({preview: {port: E2E_PORT}});
}

export async function teardown() {
    await new Promise((resolve, reject) => {
        server.httpServer.close(error => (error ? reject(error) : resolve()));
    });
}
