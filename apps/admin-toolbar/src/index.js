/* eslint ghost/ghost-custom/no-native-error: off */

import {createElement as h, render} from 'preact';

import {createAdminApi, canShowToolbar, createAuthFrame} from './auth';
import {applyBodyOffset} from './body-offset';
import {getConfig, getScript} from './config';
import {ROOT_ID} from './constants';
import {Toolbar} from './components';
import {getToolbarStyle} from './styles';

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

    const config = getConfig(getScript());
    if (!config) {
        return;
    }

    const frame = createAuthFrame(config.adminUrl);
    const api = createAdminApi(config.adminUrl, frame);

    try {
        await new Promise((resolve) => {
            frame.addEventListener('load', resolve, {once: true});
        });
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
