// Cleanup script for stopping dev:forward and killing frozen processes
const {execSync} = require('child_process');

console.log('Stopping dev:forward environment...\n');

stopDockerContainers();
killFrozenProcesses();

console.log('\nCleanup complete! You can now run yarn dev:forward again.');

function stopDockerContainers() {
    console.log('Stopping Docker containers...');
    try {
        // Stop containers using the same compose file as dev:forward
        execSync('docker compose -f compose.dev.yaml down', {
            stdio: 'inherit'
        });
    } catch (error) {
        // Don't exit on error - containers might not be running
        console.log('Note: No Docker containers were running');
    }
}

function killFrozenProcesses() {
    console.log('\nLooking for frozen nx processes...');
    try {
        // Find any frozen nx processes related to docker:dev
        const ps = execSync('ps aux | grep "nx run ghost-monorepo:docker:dev" | grep -v grep', {
            encoding: 'utf8'
        });

        if (ps.trim()) {
            // Extract PIDs and kill them
            const pids = ps.trim().split('\n').map(line => {
                const parts = line.trim().split(/\s+/);
                return parts[1]; // PID is the second column
            });

            console.log(`Found ${pids.length} frozen process(es), killing...`);
            pids.forEach(pid => {
                try {
                    execSync(`kill -9 ${pid}`);
                    console.log(`  Killed process ${pid}`);
                } catch (err) {
                    // Process might already be dead
                }
            });
        } else {
            console.log('No frozen processes found');
        }
    } catch (error) {
        // grep returns non-zero exit code if no matches found
        if (error.status === 1) {
            console.log('No frozen processes found');
        } else {
            console.error('Error checking for frozen processes:', error.message);
        }
    }
}
