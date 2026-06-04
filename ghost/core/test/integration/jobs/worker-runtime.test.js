const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');

const jobService = require('../../../core/server/services/jobs/job-service');

const runNode = (scriptPath, options) => {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath], options);
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('error', reject);
        child.on('close', (code) => {
            resolve({code, stdout, stderr});
        });
    });
};

describe('Job worker runtime', function () {
    it('starts offloaded jobs with the configured worker runtime arguments', async function () {
        const runtimeCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-job-runtime-'));
        const workerPath = path.join(runtimeCwd, 'worker.js');
        const runnerPath = path.join(runtimeCwd, 'runner.js');

        fs.writeFileSync(workerPath, `
            const {parentPort} = require('node:worker_threads');
            parentPort.postMessage('done');
        `);

        fs.writeFileSync(runnerPath, `
            const JobManager = require(process.env.JOB_MANAGER_PATH);

            (async () => {
                const manager = new JobManager({
                    errorHandler: (error) => {
                        console.error(error.stack || error.message);
                    }
                });

                manager.bree.config.worker = {
                    execArgv: JSON.parse(process.env.WORKER_EXEC_ARGV)
                };

                const completion = manager.awaitCompletion('runtime-smoke');

                await manager.addJob({
                    name: 'runtime-smoke',
                    job: process.env.WORKER_PATH
                });

                await Promise.race([
                    completion,
                    new Promise((resolve, reject) => {
                        setTimeout(() => reject(new Error('Timed out waiting for worker completion')), 5000);
                    })
                ]);

                await manager.shutdown({timeout: 1000});
            })().catch((error) => {
                console.error(error.stack || error.message);
                process.exit(1);
            });
        `);

        let result;

        try {
            result = await runNode(runnerPath, {
                cwd: runtimeCwd,
                env: {
                    ...process.env,
                    JOB_MANAGER_PATH: require.resolve('@tryghost/job-manager'),
                    NODE_OPTIONS: '',
                    WORKER_EXEC_ARGV: JSON.stringify(jobService.bree?.config?.worker?.execArgv || []),
                    WORKER_PATH: workerPath
                }
            });
        } finally {
            fs.rmSync(runtimeCwd, {recursive: true, force: true});
        }

        assert.equal(result.code, 0, result.stderr);
    });
});
