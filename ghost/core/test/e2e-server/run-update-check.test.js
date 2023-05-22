const {spawn} = require('child_process');
const assert = require('assert');
const http = require('http');
const path = require('path');

const JOB_SCRIPT_PATH = path.join(__dirname, '../../core/server/run-update-check.js');

describe('Run Update Check', function () {
    it('successfully executes the update checker', async function () {
        let mockServerRequestCount = 0;

        // Initialise mock update server
        const mockServer = http.createServer((req, res) => {
            mockServerRequestCount += 1;

            res.writeHead(200, {'Content-Type': 'application/json'});

            res.end(JSON.stringify({hello: 'world'}));
        });

        mockServer.listen(0);

        const mockServerPort = mockServer.address().port;

        // Trigger update check script and wait for it to finish
        const result = await new Promise((resolve) => {
            const cmd = spawn('node', [JOB_SCRIPT_PATH], {
                env: {
                    ...process.env,
                    FORCE_UPDATE: '1',
                    UPDATE_CHECK_URL: `http://127.0.0.1:${mockServerPort}`
                }
            });

            let error = '';

            cmd.stderr.on('data', (data) => {
                error += data.toString();
            });

            cmd.on('close', (code) => {
                resolve({code, error});
            });
        });

        // Stop mock update server
        mockServer.close();

        // Assert that the update check script ran successfully
        assert.equal(result.error, '', 'Expected no error message');
        assert.equal(result.code, 0, 'Expected exit code to be 0');
        assert.equal(mockServerRequestCount, 1, 'Expected mock server to receive 1 request. Did the script run?');
    });
});
