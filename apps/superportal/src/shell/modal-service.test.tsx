// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ModalService} from './modal-service';
import type {PortalState} from '../types';

function makeState(preview = false): PortalState {
    return {
        site: {title: 'Blog', url: 'https://example.com/', locale: 'en'},
        member: null,
        features: [],
        theme: {},
        preview
    };
}

function makeService(preview = false): {service: ModalService; onModalClosed: ReturnType<typeof vi.fn>} {
    const onModalClosed = vi.fn();
    const service = new ModalService({getState: () => makeState(preview), onModalClosed});
    return {service, onModalClosed};
}

describe('ModalService dismissible behavior', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('dismissible modals close normally', () => {
        const {service, onModalClosed} = makeService();
        const onClose = vi.fn();

        const handle = service.open(<div>content</div>, {onClose});
        handle.close();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onModalClosed).toHaveBeenCalledTimes(1);
    });

    it('non-dismissible modals ignore close requests', () => {
        const {service, onModalClosed} = makeService();
        const onClose = vi.fn();

        const handle = service.open(<div>content</div>, {onClose, dismissible: false});
        handle.close();
        handle.close();

        expect(onClose).not.toHaveBeenCalled();
        expect(onModalClosed).not.toHaveBeenCalled();
    });

    it('opening a new modal still replaces a non-dismissible one', () => {
        const {service, onModalClosed} = makeService();
        const firstOnClose = vi.fn();

        service.open(<div>first</div>, {onClose: firstOnClose, dismissible: false});
        const second = service.open(<div>second</div>, {dismissible: false});

        expect(firstOnClose).toHaveBeenCalledTimes(1);
        expect(onModalClosed).toHaveBeenCalledTimes(1);

        second.close();
        expect(onModalClosed).toHaveBeenCalledTimes(1);
    });
});

describe('ModalService preview ready message', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('posts portal-preview-ready on render when in preview inside an iframe', () => {
        const postMessage = vi.fn();
        vi.stubGlobal('parent', {postMessage});
        const {service} = makeService(true);

        service.open(<div>preview</div>, {dismissible: false});

        expect(postMessage).toHaveBeenCalledWith({type: 'portal-preview-ready', payload: {}}, '*');
    });

    it('stays silent outside preview mode', () => {
        const postMessage = vi.fn();
        vi.stubGlobal('parent', {postMessage});
        const {service} = makeService(false);

        service.open(<div>normal</div>);

        expect(postMessage).not.toHaveBeenCalled();
    });
});
