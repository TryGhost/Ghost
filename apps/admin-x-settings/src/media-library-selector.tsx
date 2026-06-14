import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect} from 'react';
import {DesignSystemApp, Modal} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, type TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {type KindFilter, MediaLibrary, type MediaSelection} from './components/settings/site/media-library-modal';
import {type MediaLibraryItem} from '@tryghost/admin-x-framework/api/media-library';
import {createRoot} from 'react-dom/client';

export interface MediaLibrarySelectorOptions {
    multiple?: boolean;
    cardKind?: KindFilter;
    // Invoked when the user chooses "Upload" instead of picking existing media.
    // Runs inside the button's click so the caller can open the native file
    // dialog while the user gesture is still live.
    onUpload?: () => void;
}

// The shared admin-x build injects this bundle's CSS into <head> (unlayered) when
// it loads. In the editor those utilities clobber Ghost's own unlayered CSS, so we
// re-wrap them in a cascade layer once: layered rules lose to Ghost's unlayered
// ones on any conflict, leaving the editor untouched, while still styling the
// modal and its portaled dropdowns. Identified by a settings-only selector.
let stylesScoped = false;
function scopeInjectedStyles() {
    if (stylesScoped) {
        return;
    }
    stylesScoped = true;
    let css = '';
    document.querySelectorAll('head style').forEach((style) => {
        if (style.textContent?.includes('#admin-x-settings-content')) {
            css += style.textContent;
            style.remove();
        }
    });
    if (css) {
        const scoped = document.createElement('style');
        scoped.setAttribute('data-media-library', '');
        scoped.textContent = `@layer ghost-media-library {\n${css}\n}`;
        document.head.appendChild(scoped);
    }
}

// The picker only issues a read-only GET, so the write/navigation callbacks of
// the framework context are never exercised and can be no-ops.
const framework: TopLevelFrameworkProps = {
    ghostVersion: '',
    externalNavigate: () => {},
    unsplashConfig: {Authorization: '', 'Accept-Version': '', 'Content-Type': '', 'App-Pragma': '', 'X-Unsplash-Cache': true},
    sentryDSN: null,
    onUpdate: () => {},
    onInvalidate: () => {},
    onDelete: () => {}
};

const SelectorModal = NiceModal.create<{selection: MediaSelection; cardKind?: KindFilter; onUpload?: () => void; onClose: () => void}>(({selection, cardKind, onUpload, onClose}) => {
    const modal = useModal();
    const close = () => {
        modal.remove();
        onClose();
    };
    return (
        <Modal footer={false} header={false} padding={false} scrolling={false} size='full' hideXOnMobile onCancel={close}>
            <MediaLibrary cardKind={cardKind} selection={selection} onClose={close} onUpload={onUpload} />
        </Modal>
    );
});

// Mounts the media library as a one-shot picker from outside the React app (the
// Ember editor). Resolves with the chosen items, or [] if closed without a
// choice. Self-contained: it owns its React root, scopes its styles to a cascade
// layer so they never override the host page, and tears everything down on close.
export function renderMediaLibrarySelector(options: MediaLibrarySelectorOptions = {}): Promise<MediaLibraryItem[]> {
    return new Promise((resolve) => {
        scopeInjectedStyles();

        const mount = document.createElement('div');
        // Own stacking context so the modal's high z-index stays contained here.
        // Radix dropdowns portal to <body> as a later sibling and would otherwise
        // render behind the modal in the editor (in Settings the surrounding app
        // container already provides this context).
        mount.style.isolation = 'isolate';
        document.body.appendChild(mount);
        const root = createRoot(mount);

        let chosen: MediaLibraryItem[] = [];

        const cleanup = () => {
            root.unmount();
            mount.remove();
            resolve(chosen);
        };

        // MediaLibrary calls onInsert then onClose, so the choice is recorded
        // before cleanup resolves the promise.
        const selection: MediaSelection = {
            multiple: options.multiple,
            onInsert: (items) => {
                chosen = items;
            }
        };

        // Open the native dialog (while the click gesture is still live) then
        // close the library, handing back to today's upload-a-new-file flow.
        const onUpload = options.onUpload && (() => {
            options.onUpload?.();
            cleanup();
        });

        const Host: React.FC = () => {
            useEffect(() => {
                NiceModal.show(SelectorModal, {selection, cardKind: options.cardKind, onUpload, onClose: cleanup});
            }, []);
            return null;
        };

        root.render(
            <FrameworkProvider {...framework}>
                <DesignSystemApp className='admin-x-settings' darkMode={false} fetchKoenigLexical={async () => {}}>
                    <Host />
                </DesignSystemApp>
            </FrameworkProvider>
        );
    });
}
