/* eslint ghost/ghost-custom/no-native-error: off */

import {createElement as h, render} from 'preact';

import {createAdminApi, canShowToolbar, createAuthFrame} from './auth';
import {applyBodyOffset} from './body-offset';
import {getConfig, getScript} from './config';
import {ROOT_ID} from './constants';
import {Toolbar} from './components';
import {getToolbarStyle} from './styles';

const AUTH_FRAME_LOAD_TIMEOUT = 5000;

function waitForFrameLoad(frame) {
    return new Promise((resolve, reject) => {
        let timeout;

        function cleanup() {
            window.clearTimeout(timeout);
            frame.removeEventListener('load', handleLoad);
            frame.removeEventListener('error', handleError);
        }

        function handleLoad() {
            cleanup();
            resolve();
        }

        function handleError() {
            cleanup();
            reject(new Error('auth_frame_load_error'));
        }

        timeout = window.setTimeout(() => {
            cleanup();
            reject(new Error('auth_frame_load_timeout'));
        }, AUTH_FRAME_LOAD_TIMEOUT);

        frame.addEventListener('load', handleLoad);
        frame.addEventListener('error', handleError);
    });
}

function renderToolbar({config, user, frame}) {
    if (document.getElementById(ROOT_ID)) {
        return;
    }

    const host = document.createElement('div');
    host.id = ROOT_ID;
    const shadow = host.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    const mount = document.createElement('div');

    style.textContent = getToolbarStyle();
    shadow.append(style, mount);
    document.body.appendChild(host);

    render(h(Toolbar, {config, user}), mount);

    window.requestAnimationFrame(() => {
        const toolbar = mount.querySelector('.gh-admin-toolbar');
        applyBodyOffset(toolbar?.offsetHeight || 56);
    });

    frame.dataset.toolbarMounted = 'true';
}

async function init() {
    if (!document.body || document.getElementById(ROOT_ID)) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('admin_toolbar') === '0') {
        return;
    }

    const config = getConfig(getScript());
    if (!config) {
        return;
    }

    const frame = createAuthFrame(config.adminUrl);
    const api = createAdminApi(config.adminUrl, frame);

    try {
        await waitForFrameLoad(frame);
        const user = await api.getUser();
        if (!user || !canShowToolbar(user)) {
            frame.remove();
            return;
        }
        renderToolbar({config, user, frame});
    } catch {
        frame.remove();
    }
}

function start() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {once: true});
    } else {
        init();
    }
}

if (typeof document !== 'undefined') {
    start();
}
