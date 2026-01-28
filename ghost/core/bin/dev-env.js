#!/usr/bin/env node

/**
 * Outputs shell export statements for Ghost development environment variables.
 *
 * Usage: eval "$(node bin/dev-env.js)"
 *
 * Exports:
 *   GHOST_URL  - The configured Ghost site URL (e.g., "http://localhost:2368/blog/")
 *   SUBDIR     - The subdirectory path from the URL (e.g., "/blog"), empty if none
 */

const path = require('path');
const loader = require('../core/shared/config/loader');

const nconf = loader.loadNconf({customConfigPath: path.join(__dirname, '..')});

const url = process.env.GHOST_URL || nconf.get('url') || 'http://localhost:2368/';
const subdir = new URL(url).pathname.replace(/\/$/, '');

process.stdout.write(`export GHOST_URL="${url}"\nexport SUBDIR="${subdir}"\n`);
