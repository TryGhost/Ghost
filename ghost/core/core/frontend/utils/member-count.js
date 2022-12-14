const humanNumber = require('human-number');
const {api} = require('../services/proxy');

async function getMemberStats() {
    let memberStats = this.data || await api.stats.memberCountHistory.query();
    const {free, paid, comped} = memberStats.meta.totals;
    let total = free + paid + comped;
    return {free, paid, comped, total};
}

const numberWithCommas = (n) => {
    return n.toLocaleString();
};

const rounding = (n, roundTo) => {
    return Math.floor(n / roundTo) * roundTo;
};

// Rounding https://github.com/TryGhost/Team/issues/1667
const memberCountRounding = (memberCount) => {
    if (memberCount <= 50) {
        return memberCount;
    }

    if (memberCount > 50 && memberCount <= 100) {
        return `${numberWithCommas(rounding(memberCount, 10))}+`;
    }

    if (memberCount > 100 && memberCount <= 1000) {
        return `${numberWithCommas(rounding(memberCount, 50))}+`;
    }

    if (memberCount > 1000 && memberCount <= 10000) {
        return `${numberWithCommas(rounding(memberCount, 100))}+`;
    }

    if (memberCount > 10000 && memberCount <= 100000) {
        return `${numberWithCommas(rounding(memberCount, 1000))}+`;
    }

    if (memberCount > 100000 && memberCount <= 1000000) {
        return `${humanNumber(rounding(memberCount, 10000)).toLowerCase()}+`;
    }

    if (memberCount > 1000000) {
        return `${humanNumber(rounding(memberCount, 100000)).toLowerCase()}+`;
    }
};

module.exports = {memberCountRounding, getMemberStats};
