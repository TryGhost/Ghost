import path from 'path';

export const CONFIG_DIR = path.resolve(__dirname, '../../data/state');

export const DOCKER_COMPOSE_CONFIG = {
    FILE_PATH: path.resolve(__dirname, '../../compose.yml'),
    PROJECT: 'ghost-e2e'
};

export const GHOST_DEFAULTS = {
    // if not specified this would be the tag of the Ghost project, built at root of the repository
    IMAGE: process.env.GHOST_IMAGE_TAG || 'ghost-monorepo',
    PORT: 2368,
    WORKDIR: '/home/ghost/ghost/core'
};

export const MYSQL = {
    HOST: 'mysql',
    PORT: 3306,
    USER: 'root',
    PASSWORD: 'root'
};

export const TINYBIRD = {
    LOCAL_HOST: 'tinybird-local',
    PORT: 7181,
    CLI_ENV_PATH: '/mnt/shared-config/.env.tinybird',
    CONFIG_DIR: CONFIG_DIR
};

export const PORTAL = {
    PORT: 4175
};

export const MAILPIT = {
    PORT: 1025
};

