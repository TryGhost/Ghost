import path from 'path';

export const COMPOSE_FILE_PATH = path.resolve(__dirname, '../../compose.yml');
export const COMPOSE_PROJECT = 'ghost-e2e';

// if not specified this would be the tag of the Ghost project, built at root of the repository
export const DEFAULT_GHOST_IMAGE = process.env.GHOST_IMAGE_TAG || 'ghost-monorepo';
export const DEFAULT_WORKDIR = '/home/ghost/ghost/core';

export const GHOST_PORT = 2368;

export const MYSQL = {
    HOST: 'mysql',
    PORT: 3306,
    USER: 'root',
    PASSWORD: 'root'
};

export const TB = {
    LOCAL_HOST: 'tinybird-local',
    PORT: 7181,
    CLI_ENV_PATH: '/mnt/shared-config/.env.tinybird'
};

export const STATE_DIR = path.resolve(__dirname, '../../data/state');

