import useSettingsPanelReposition from '../../../src/hooks/useSettingsPanelReposition';
import {afterEach, beforeEach, expect, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

function Panel() {
    const {ref} = useSettingsPanelReposition({}, 'regular');
    return <div ref={ref} data-testid="panel" />;
}

function renderPanelBesideCard({panelHeight}: {panelHeight: number}) {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(panelHeight);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320);

    const card = document.createElement('div');
    card.dataset.kgCardEditing = 'true';
    card.style.transform = 'none';
    card.getBoundingClientRect = () => DOMRect.fromRect({x: 200, y: 300, width: 600, height: 200});
    document.body.appendChild(card);

    render(<Panel />);
    return screen.getByTestId('panel');
}

function dragUpBy(panel: HTMLElement, distance: number) {
    fireEvent.mouseDown(panel, {button: 0, clientX: 900, clientY: 400});
    fireEvent.mouseMove(window, {clientX: 900, clientY: 400 - distance});
    fireEvent.mouseUp(window);
}

function panelTop(panel: HTMLElement) {
    return Number(panel.style.transform.match(/translate\(.+px, (.+)px\)/)?.[1]);
}

describe('useSettingsPanelReposition', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        });
        vi.stubGlobal('innerWidth', 1280);
        vi.stubGlobal('innerHeight', 800);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('keeps a dragged panel below the publish menu', () => {
        const panel = renderPanelBesideCard({panelHeight: 200});

        dragUpBy(panel, 400);

        expect(panelTop(panel)).toBe(66);
    });

    it('lets a panel too tall to fit below the publish menu reach the top of the window', () => {
        const panel = renderPanelBesideCard({panelHeight: 760});

        dragUpBy(panel, 400);

        expect(panelTop(panel)).toBe(10);
    });
});
