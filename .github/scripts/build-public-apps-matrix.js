// Builds the publish matrix for public UMD apps, filtered to the apps affected
// in the current run. The output (stdout, compact JSON array) feeds the
// publish_public_apps job's `strategy.matrix.include` via fromJSON.
//
// Matrix context isn't available in a job-level `if:`, so the affected gate
// can't live on the publish job — instead we compute the set here in job_setup
// (mirroring the affected_playwright_projects dynamic matrix) and the job skips
// itself when the result is `[]`.
//
// The app list (and the CURRENT_MINOR placeholder the publish job substitutes
// with the released major.minor before purging jsDelivr) comes from the shared
// public-apps.json.

const PUBLIC_APPS = require('./public-apps.json');

/**
 * @param {string[]} affectedProjects - nx project names affected in this run
 * @returns {Array<{package_name: string, package_path: string, cdn_paths: string}>}
 *   matrix entries with cdn_paths flattened to the newline-delimited string the
 *   publish job's purge step expects.
 */
function buildMatrix(affectedProjects) {
    const affected = new Set(affectedProjects);
    return PUBLIC_APPS
        .filter(app => affected.has(app.packageName))
        .map(app => ({
            package_name: app.packageName,
            package_path: app.path,
            cdn_paths: app.cdnPaths.join('\n')
        }));
}

function main() {
    const raw = process.argv[2] || '[]';

    let affectedProjects;
    try {
        affectedProjects = JSON.parse(raw);
    } catch (error) {
        throw new Error(`Invalid affected-projects JSON: ${error.message}`);
    }

    if (!Array.isArray(affectedProjects)) {
        throw new Error('affected-projects argument must be a JSON array');
    }

    // Stdout is the contract — the workflow captures this into a job output.
    process.stdout.write(JSON.stringify(buildMatrix(affectedProjects)));
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports = {buildMatrix, PUBLIC_APPS};
