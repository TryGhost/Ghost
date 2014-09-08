function ModuleError(e) {
    console.error('\033[31mERROR: One or more Node modules required by Ghost could not be found. \n\n' +
                  '\x1B[32mPlease run \'npm install --production\' and try starting Ghost again. \n' +
                  '\x1B[32mMore information and help can be found at http://support.ghost.org. \n\n' +
                  '\x1B[39mThe output was: \n' + e);
}

module.exports = ModuleError;
