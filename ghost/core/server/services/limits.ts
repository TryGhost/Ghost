import logging from '@tryghost/logging';
import { LimitService } from '@tryghost/limit-service';
import limits from '../../../shared/limits';
import { loadHostLimits } from '../../../shared/limits/host-limits';
import config from '../../shared/config';
import db from '../data/db';

// LEGACY ALIAS. Limits are a shared module now: ghost/shared/limits, started
// by the shared list in ghost/bootstrap/shared.ts. This file keeps the old
// import path working for the code that has not been handed the instance.
//
// About twenty modules read `limitService` off this file when they are
// loaded, which is before Ghost starts (models, API validators, auth), and
// unit tests stub its methods without starting anything. The shared module's
// instance does not exist that early. So what is exported is a stand-in that
// forwards every use to the shared module's instance once it has started, and
// until then to an empty limit service, which is what this file used to export
// before `init()`.

const beforeStart = new LimitService();
let started: LimitService | undefined;

function current(): LimitService {
  if (started) {
    return started;
  }
  try {
    started = limits.service;
    return started;
  } catch {
    return beforeStart;
  }
}

export const limitService: LimitService = new Proxy(beforeStart, {
  get: (_target, property) => Reflect.get(current(), property),
  set: (_target, property, value) => Reflect.set(current(), property, value),
  has: (_target, property) => Reflect.has(current(), property),
  deleteProperty: (_target, property) => Reflect.deleteProperty(current(), property),
  defineProperty: (_target, property, descriptor) =>
    Reflect.defineProperty(current(), property, descriptor),
  getOwnPropertyDescriptor: (_target, property) =>
    Reflect.getOwnPropertyDescriptor(current(), property),
  ownKeys: () => Reflect.ownKeys(current()),
});

/**
 * Reads the host's limits from config again. Boot no longer calls this: the
 * shared module does it on every start. Tests call it after changing config.
 */
export const init = () => {
  loadHostLimits(current(), { config, logging, database: db });
};
