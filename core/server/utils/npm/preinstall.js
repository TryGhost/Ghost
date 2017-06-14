var validVersions = process.env.npm_package_engines_node.split(' || '),
    currentVersion = process.versions.node,
    foundMatch = false,
    majMinRegex = /(\d+\.\d+)/,
    majorRegex = /^\d+/,
    minorRegex = /\d+$/,
    exitCodes = {
        NODE_VERSION_UNSUPPORTED: 231
    };

function doError() {
    console.error('\x1B[31mERROR: Unsupported version of Node');
    console.error('\x1B[37mGhost supports LTS Node versions: ' + process.env.npm_package_engines_node);
    console.error('You are currently using version: ' + process.versions.node + '\033[0m');
    console.error('\x1B[32mThis check can be overridden, see https://docs.ghost.org/v0.11.9/docs/supported-node-versions for more info\033[0m');

    process.exit(exitCodes.NODE_VERSION_UNSUPPORTED);
}

if (process.env.GHOST_NODE_VERSION_CHECK === 'false') {
    console.log('\x1B[33mSkipping Node version check\033[0m');
} else {
    try {
        currentVersion = currentVersion.match(majMinRegex)[0];

        validVersions.forEach(function (version) {
            var matchChar = version.charAt(0),
                versionString = version.match(majMinRegex)[0];

            if (
                (matchChar === '~' && currentVersion === versionString)
                || (matchChar === '^'
                    && currentVersion.match(majorRegex)[0] === versionString.match(majorRegex)[0]
                    && parseInt(currentVersion.match(minorRegex)[0]) >= parseInt(versionString.match(minorRegex)[0])
                )
            ) {
                foundMatch = true;
            }
        });

        if (foundMatch !== true) {
            doError();
        }
    } catch (e) {
        doError();
    }
}
