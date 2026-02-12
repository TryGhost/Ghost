/* eslint-disable no-console */
const {promisify} = require('util');
const {exec} = require('child_process');
const {buildStripeCommand} = require('./utils/stripe-cli');

module.exports = async function globalSetup() {
    const command = buildStripeCommand('listen', '--print-secret');

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const {stdout, stderr} = await promisify(exec)(command, {timeout: 15000});
            if (stderr) {
                console.error(`[stripe] ${stderr.toString().trimEnd()}`);
            }
            const secret = stdout.toString().trim();
            if (!secret.startsWith('whsec_')) {
                throw new Error(`Unexpected webhook secret format: "${secret}"`);
            }
            console.log('[stripe] Webhook secret obtained');
            process.env.WEBHOOK_SECRET = secret;
            return;
        } catch (error) {
            lastError = error;
            const stderr = error.stderr ? `\n  stderr: ${error.stderr.toString().trimEnd()}` : '';
            const stdout = error.stdout ? `\n  stdout: ${error.stdout.toString().trimEnd()}` : '';
            console.error(`[stripe] Attempt ${attempt}/3 failed: ${error.message}${stderr}${stdout}`);
            if (attempt < 3) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 1000 * Math.pow(2, attempt - 1));
                });
            }
        }
    }
    throw lastError;
};
