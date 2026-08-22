import CardContext from '../../src/context/CardContext';
import KoenigComposerContext, {defaultKoenigComposerContext} from '../../src/context/KoenigComposerContext';
import React from 'react';
import {AddonNodeComponent} from '../../src/nodes/AddonNode';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {act, render, screen, waitFor} from '@testing-library/react';
import {vi} from 'vitest';

vi.stubGlobal('ResizeObserver', class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
});

const dataset = {
    id: 'block-1',
    addonHandle: 'transistor',
    blockName: 'episode-player',
    label: 'Transistor podcast player',
    props: {},
    html: '<article>Episode 12</article>',
    css: 'article { color: rebeccapurple; }',
    portableHtml: '',
    resourceOrigins: [],
    initialHeight: 240
};

describe('AddonNodeComponent', function () {
    it('shows the saved snapshot in a non-interactive iframe', function () {
        render(<AddonNodeComponent dataset={dataset} />);

        const iframe = screen.getByTitle('Transistor podcast player');
        expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
        expect(iframe).toHaveAttribute('tabindex', '-1');
        expect(iframe).toHaveStyle({height: '240px', pointerEvents: 'none'});
        expect(iframe.getAttribute('srcdoc')).toContain('<article>Episode 12</article>');
        expect(iframe.getAttribute('srcdoc')).toContain('ghost-addon-bootstrap');
    });

    it('resizes the preview when its sandbox reports a new content height', async function () {
        render(<AddonNodeComponent dataset={dataset} />);

        const iframe = screen.getByTitle('Transistor podcast player');
        iframe.style.fontFamily = '"Publisher Sans", sans-serif';
        const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
        act(() => {
            window.dispatchEvent(new MessageEvent('message', {
                data: {
                    type: 'ghost-addon',
                    instanceId: 'block-1',
                    action: 'resize',
                    height: 381.2
                },
                source: iframe.contentWindow
            }));
        });

        await waitFor(() => expect(iframe).toHaveStyle({height: '382px'}));
        expect(postMessage).toHaveBeenCalledWith({
            type: 'ghost-addon-host',
            instanceId: 'block-1',
            action: 'connected',
            fontFamily: '"Publisher Sans", sans-serif'
        }, '*');
    });

    it('shows the saved snapshot when the host has no image uploader', function () {
        const contextWithoutUploader = {
            ...defaultKoenigComposerContext,
            fileUploader: {
                fileTypes: {},
                useFileUpload: () => undefined as never
            }
        };

        render(
            <LexicalComposer initialConfig={{namespace: 'addon-no-uploader-test', nodes: [], onError: error => { throw error; }}}>
                <KoenigComposerContext.Provider value={contextWithoutUploader}>
                    <AddonNodeComponent dataset={dataset} nodeKey="node-1" />
                </KoenigComposerContext.Provider>
            </LexicalComposer>
        );

        expect(screen.getByTitle('Transistor podcast player')).toBeInTheDocument();
    });

    it('keeps an activated settings sandbox alive while its panel is hidden', async function () {
        const destroy = vi.fn();
        const upload = vi.fn().mockResolvedValue([{url: 'https://site.example/content/images/chart.png'}]);
        const createSettingsSurface = vi.fn(() => ({
            receiver: {},
            ready: new Promise<void>(() => {}),
            updateProps: vi.fn().mockResolvedValue(undefined),
            destroy
        }));
        const koenigContext = {
            ...defaultKoenigComposerContext,
            fileUploader: {
                fileTypes: {},
                useFileUpload: () => ({upload, isLoading: false, progress: 0, errors: [], filesNumber: 0})
            },
            cardConfig: {
                addons: {
                    blocks: [{addonHandle: 'transistor', blockName: 'episode-player', label: 'Podcast', hasSettings: true}],
                    createSettingsSurface
                }
            }
        };

        function Harness({isEditing}: {isEditing: boolean}) {
            return (
                <LexicalComposer initialConfig={{namespace: 'addon-settings-test', nodes: [], onError: error => { throw error; }}}>
                    <KoenigComposerContext.Provider value={koenigContext}>
                        <CardContext.Provider value={{
                            isSelected: isEditing,
                            captionHasFocus: false,
                            isEditing,
                            cardWidth: 'regular',
                            setCardWidth: vi.fn(),
                            setCaptionHasFocus: vi.fn(),
                            setEditing: vi.fn(),
                            nodeKey: 'node-1',
                            cardContainerRef: React.createRef<HTMLDivElement>()
                        }}>
                            <AddonNodeComponent dataset={dataset} nodeKey="node-1" />
                        </CardContext.Provider>
                    </KoenigComposerContext.Provider>
                </LexicalComposer>
            );
        }

        const view = render(<Harness isEditing={true} />);
        await waitFor(() => expect(createSettingsSurface).toHaveBeenCalledOnce());

        const request = createSettingsSurface.mock.calls[0][0];
        await expect(request.uploadImage({name: 'chart.png', type: 'image/png', bytes: new Uint8Array([1, 2, 3])})).resolves.toEqual({
            url: 'https://site.example/content/images/chart.png'
        });
        expect(upload).toHaveBeenCalledWith([expect.any(File)], {throwOnError: true});

        upload.mockRejectedValueOnce({message: 'Your plan only supports smaller image uploads.'});
        await expect(request.uploadImage({name: 'chart.png', type: 'image/png', bytes: new Uint8Array([1, 2, 3])})).rejects.toThrow(
            'Your plan only supports smaller image uploads.'
        );

        view.rerender(<Harness isEditing={false} />);
        expect(destroy).not.toHaveBeenCalled();

        view.unmount();
        expect(destroy).toHaveBeenCalledOnce();
    });
});
