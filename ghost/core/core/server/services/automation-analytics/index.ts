import type {Knex} from 'knex';
import {AutomationAnalyticsService} from './service';
import type {AutomationBrowseStats} from './types';

const {knex} = require('../../data/db') as {knex: Knex};
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

let service: AutomationAnalyticsService | null = null;

export function init(): void {
    if (service) {
        return;
    }
    const siteUuid = settingsCache.get('site_uuid');
    if (typeof siteUuid !== 'string' || !siteUuid) {
        throw new errors.InternalServerError({message: 'Cannot initialize automation analytics without site UUID'});
    }
    service = new AutomationAnalyticsService({knex, siteUuid, config, logging});
}

export function start(): void {
    service?.start();
}

export async function stop(): Promise<void> {
    await service?.stop();
}

export function isConfigured(): boolean {
    return service?.isConfigured() ?? false;
}

export async function sync(): Promise<void> {
    if (!service) {
        throw new errors.InternalServerError({message: 'Automation analytics service is not initialized'});
    }
    await service.sync();
}

export async function fetchStats(): Promise<Map<string, AutomationBrowseStats>> {
    if (!service) {
        throw new errors.InternalServerError({message: 'Automation analytics service is not initialized'});
    }
    return await service.fetchStats();
}

export type {AutomationAnalytics, AutomationBrowseStats} from './types';
