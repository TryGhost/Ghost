// Keep the acceptance demo separate from Admin's development server on 5174.
export const E2E_PORT = Number(process.env.KOENIG_TEST_PORT ?? 5185);
if (!Number.isInteger(E2E_PORT) || E2E_PORT < 1 || E2E_PORT > 65535) {
    throw new Error('KOENIG_TEST_PORT must be an integer between 1 and 65535');
}

async function startTestServer() {
    const {createServer} = await import('vite');
    const server = await createServer({server: {port: E2E_PORT, strictPort: true}});
    try {
        await server.listen();
        server.printUrls();
    } catch (error) {
        await server.close();
        throw error;
    }
}

if (import.meta.main) {
    startTestServer().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
