/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/utils/member-count.js @ 407e032dc7 — transforms: imports→seam
import humanNumber from 'human-number';
import {api} from '../seam/proxy.ts';

/**
 * @returns {Promise<{
 *     free: number;
 *     paid: number;
 *     comped: number;
 *     gift: number;
 *     total: number;
 * }>}
 */
export async function getMemberStats(this: any) {
    const memberStats = this.data || await api.stats.memberCountHistory.query();
    const {free, paid, comped, gift} = memberStats.meta.totals;
    const total = free + paid + comped + gift;
    return {free, paid, comped, gift, total};
}

/**
 * @param {number} n
 * @returns {string}
 */
const numberWithCommas = (n: number) => {
    return n.toLocaleString();
};

/**
 * @param {number} n
 * @param {number} roundTo
 * @returns {number}
 */
const rounding = (n: number, roundTo: number) => {
    return Math.floor(n / roundTo) * roundTo;
};

/**
 * @param {number} memberCount
 * @returns {string}
 */
export const memberCountRounding = (memberCount: number) => {
    if (memberCount <= 50) {
        return numberWithCommas(memberCount);
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
    return undefined;
};
