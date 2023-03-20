/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Doc} from 'yjs';
import {WebsocketProvider} from 'y-websocket';

const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);
const WEBSOCKET_ENDPOINT = params.get('multiplayerEndpoint') || 'ws://localhost:1234';
const WEBSOCKET_SLUG = 'demo';
const WEBSOCKET_ID = params.get('multiplayerId') || '0';

// parent dom -> child doc
export function createWebsocketProvider(
    id,
    yjsDocMap,
) {
    let doc = yjsDocMap.get(id);

    if (doc === undefined) {
        doc = new Doc();
        yjsDocMap.set(id, doc);
    } else {
        doc.load();
    }

    const provider = new WebsocketProvider(
        WEBSOCKET_ENDPOINT,
        WEBSOCKET_SLUG + '/' + WEBSOCKET_ID + '/' + id,
        doc,
        {
            connect: false
        },
    );

    provider.on('status', (event) => {
        // eslint-disable-next-line no-console
        console.log(event.status); // logs "connected" or "disconnected"
    });

    return provider;
}
