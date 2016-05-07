var os = require('os');

/**
 * Gather a list of local ipv4 addresses
 * @return {Array<String>}
 */
function getIPs() {
    var ifaces = os.networkInterfaces(),
        ips = [];

    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            // only support IPv4
            if (iface.family !== 'IPv4') {
                return;
            }

            ips.push(iface.address);
        });
    });

    return ips;
}

module.exports = {
    getIPs: getIPs
};
